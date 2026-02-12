// Shared backend canister ID resolution with source tracking
// Tries multiple sources in priority order and reports which source was used

const PLACEHOLDER_CANISTER_ID = 'PLACEHOLDER_BACKEND_CANISTER_ID';

export interface CanisterIdResolution {
  canisterId: string | null;
  source: 'import.meta.env' | 'window.__ENV__' | 'declarations' | 'url-fallback' | 'none';
  sourcesAttempted: string[];
  error?: string;
}

/**
 * Checks if a canister ID value is valid (non-empty and not a placeholder).
 */
function isValidCanisterId(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === PLACEHOLDER_CANISTER_ID) return false;
  return true;
}

/**
 * Attempts to load canister ID from generated declarations.
 * This is an async operation that tries to fetch canister_ids.json at runtime.
 */
async function tryLoadCanisterIdFromDeclarations(): Promise<string | null> {
  try {
    // Try to fetch canister_ids.json at runtime
    // This file may not exist, so we handle errors gracefully
    const response = await fetch('/canister_ids.json').catch(() => null);
    
    if (!response || !response.ok) {
      return null;
    }
    
    const canisterIds = await response.json().catch(() => null);
    
    if (!canisterIds || typeof canisterIds !== 'object') {
      return null;
    }
    
    // Check for backend canister ID in various possible keys
    const backendId = 
      canisterIds.backend?.ic ||
      canisterIds.backend?.local ||
      canisterIds.backend;
    
    if (isValidCanisterId(backendId)) {
      return backendId.trim();
    }
    
    return null;
  } catch (e) {
    // Declarations not available or don't contain canister ID
    return null;
  }
}

/**
 * Resolves the backend canister ID from multiple sources in priority order:
 * 1. Vite build-time environment variables (import.meta.env)
 * 2. Runtime environment (window.__ENV__)
 * 3. Generated backend declarations (canister_ids.json)
 * 4. URL-based fallback (only for local development)
 * 
 * Returns detailed resolution information including which source was used.
 */
export function resolveBackendCanisterId(): CanisterIdResolution {
  const sourcesAttempted: string[] = [];
  
  // 1. Try Vite build-time environment variables (import.meta.env)
  sourcesAttempted.push('import.meta.env');
  const viteCanisterId = 
    import.meta.env.VITE_CANISTER_ID_BACKEND ||
    import.meta.env.VITE_BACKEND_CANISTER_ID;
  
  if (isValidCanisterId(viteCanisterId)) {
    return {
      canisterId: (viteCanisterId as string).trim(),
      source: 'import.meta.env',
      sourcesAttempted,
    };
  }

  // 2. Try runtime environment (window.__ENV__)
  sourcesAttempted.push('window.__ENV__');
  try {
    const envJson = window.__ENV__;
    const runtimeCanisterId = envJson?.CANISTER_ID_BACKEND;
    if (isValidCanisterId(runtimeCanisterId)) {
      return {
        canisterId: (runtimeCanisterId as string).trim(),
        source: 'window.__ENV__',
        sourcesAttempted,
      };
    }
  } catch (e) {
    // window.__ENV__ not available
  }

  // 3. Declarations fallback is async, so we can't use it in sync resolution
  // Mark it as attempted but note it requires async resolution
  sourcesAttempted.push('declarations (requires async)');

  // 4. URL-based fallback (only safe for local development)
  sourcesAttempted.push('url-fallback');
  const hostname = window.location.hostname;
  
  // Only use URL fallback for localhost (local development)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const localMatch = hostname.match(/^(localhost|127\.0\.0\.1)$/);
    if (localMatch) {
      // For local development, we can't extract from URL
      // This should have been set via environment variables
      return {
        canisterId: null,
        source: 'none',
        sourcesAttempted,
        error: `Backend canister ID not configured. For production deployments, /env.json must contain a valid, non-placeholder CANISTER_ID_BACKEND value (not "${PLACEHOLDER_CANISTER_ID}"). For local development, set VITE_CANISTER_ID_BACKEND at build time.`,
      };
    }
  }

  // For production IC domains, DO NOT assume backend canister ID equals frontend canister ID
  // The subdomain is the frontend canister, not the backend
  const icDomainMatch = hostname.match(/^([a-z0-9-]+)\.(ic0\.app|icp0\.io)$/);
  if (icDomainMatch) {
    return {
      canisterId: null,
      source: 'none',
      sourcesAttempted,
      error: `Backend canister ID not configured in deployment. The frontend canister ID (URL subdomain) cannot be used as the backend canister ID. Production deployments require /env.json to contain a valid, non-placeholder CANISTER_ID_BACKEND value (not "${PLACEHOLDER_CANISTER_ID}"). Example: { "CANISTER_ID_BACKEND": "your-backend-canister-id" }`,
    };
  }

  // No canister ID found from any source
  return {
    canisterId: null,
    source: 'none',
    sourcesAttempted,
    error: `Backend canister ID not configured. Production deployments require /env.json to contain a valid, non-placeholder CANISTER_ID_BACKEND value (not "${PLACEHOLDER_CANISTER_ID}"). Example: { "CANISTER_ID_BACKEND": "your-backend-canister-id" }`,
  };
}

/**
 * Async version that tries declarations fallback before giving up.
 * Use this when you can afford the async operation.
 */
export async function resolveBackendCanisterIdAsync(): Promise<CanisterIdResolution> {
  // First try synchronous sources
  const syncResolution = resolveBackendCanisterId();
  
  // If we found a canister ID, return it
  if (syncResolution.canisterId) {
    return syncResolution;
  }
  
  // Try declarations fallback
  const sourcesAttempted = [...syncResolution.sourcesAttempted];
  const declarationsCanisterId = await tryLoadCanisterIdFromDeclarations();
  
  if (declarationsCanisterId) {
    return {
      canisterId: declarationsCanisterId,
      source: 'declarations',
      sourcesAttempted,
    };
  }
  
  // Still no canister ID found
  return {
    ...syncResolution,
    sourcesAttempted,
  };
}

/**
 * Gets the backend canister ID or throws a clear error.
 * Use this when you need the canister ID and cannot proceed without it.
 */
export function getBackendCanisterIdOrThrow(): string {
  const resolution = resolveBackendCanisterId();
  
  if (!resolution.canisterId) {
    const errorMessage = resolution.error || 'Backend canister ID not found';
    const sourcesMsg = `Attempted sources: ${resolution.sourcesAttempted.join(', ')}`;
    throw new Error(`${errorMessage}\n${sourcesMsg}`);
  }
  
  return resolution.canisterId;
}

/**
 * Async version that tries declarations fallback before throwing.
 */
export async function getBackendCanisterIdOrThrowAsync(): Promise<string> {
  const resolution = await resolveBackendCanisterIdAsync();
  
  if (!resolution.canisterId) {
    const errorMessage = resolution.error || 'Backend canister ID not found';
    const sourcesMsg = `Attempted sources: ${resolution.sourcesAttempted.join(', ')}`;
    throw new Error(`${errorMessage}\n${sourcesMsg}`);
  }
  
  return resolution.canisterId;
}

