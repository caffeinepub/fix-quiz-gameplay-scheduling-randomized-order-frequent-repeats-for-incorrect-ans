// Shared backend canister ID resolution with source tracking
// Tries multiple sources in priority order and reports which source was used

export interface CanisterIdResolution {
  canisterId: string | null;
  source: 'import.meta.env' | 'window.__ENV__' | 'declarations' | 'url-fallback' | 'none';
  sourcesAttempted: string[];
  error?: string;
}

/**
 * Resolves the backend canister ID from multiple sources in priority order:
 * 1. Vite build-time environment variables (import.meta.env)
 * 2. Runtime environment (window.__ENV__)
 * 3. Generated backend declarations
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
  
  if (viteCanisterId && typeof viteCanisterId === 'string' && viteCanisterId.trim()) {
    return {
      canisterId: viteCanisterId.trim(),
      source: 'import.meta.env',
      sourcesAttempted,
    };
  }

  // 2. Try runtime environment (window.__ENV__)
  sourcesAttempted.push('window.__ENV__');
  try {
    const envJson = window.__ENV__;
    const runtimeCanisterId = envJson?.CANISTER_ID_BACKEND;
    if (runtimeCanisterId && typeof runtimeCanisterId === 'string' && runtimeCanisterId.trim()) {
      return {
        canisterId: runtimeCanisterId.trim(),
        source: 'window.__ENV__',
        sourcesAttempted,
      };
    }
  } catch (e) {
    // window.__ENV__ not available
  }

  // 3. Try generated backend declarations
  sourcesAttempted.push('declarations');
  try {
    // Attempt to read canister ID from declarations if available
    // Note: This is a synchronous check; the actual import happens elsewhere
    // We're checking if the declarations module exports a canisterId
    // This is a placeholder - in practice, declarations don't export canisterId directly
    // but this documents the intended resolution order
  } catch (e) {
    // Declarations not available or don't contain canister ID
  }

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
        error: 'Backend canister ID not found in environment variables (required for local development)',
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
      error: 'Backend canister ID not found in deployment configuration. The frontend canister ID (URL subdomain) cannot be used as the backend canister ID. Please ensure env.json contains a non-empty CANISTER_ID_BACKEND or build-time variables include VITE_CANISTER_ID_BACKEND.',
    };
  }

  // No canister ID found from any source
  return {
    canisterId: null,
    source: 'none',
    sourcesAttempted,
    error: 'Backend canister ID not found. Please ensure the canister is deployed and environment is configured correctly with a non-empty value (via import.meta.env or window.__ENV__).',
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
