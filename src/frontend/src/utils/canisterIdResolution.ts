// Shared backend canister ID resolver with manual override support
// Tries multiple sources in priority order and provides detailed resolution tracking

import { getActiveManualOverride } from './manualBackendCanisterOverride';

export interface CanisterIdResolution {
  canisterId: string | null;
  source: string;
  sourcesAttempted: string[];
  error?: string;
}

const PLACEHOLDER_CANISTER_ID = 'PLACEHOLDER_BACKEND_CANISTER_ID';

/**
 * Waits for runtime env.json to finish loading (with timeout).
 * Returns true if loaded successfully, false if timeout or error.
 */
async function waitForRuntimeEnvLoad(timeoutMs: number = 3000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const loadStatus = (window as any).__ENV_LOAD_STATUS__;
    
    // If loaded successfully, return true
    if (loadStatus === 'loaded') {
      return true;
    }
    
    // If error or missing, stop waiting
    if (loadStatus === 'error' || loadStatus === 'missing') {
      return false;
    }
    
    // If still loading, wait a bit and check again
    if (loadStatus === 'loading') {
      await new Promise(resolve => setTimeout(resolve, 50));
      continue;
    }
    
    // If no status marker, assume not loading
    return false;
  }
  
  // Timeout reached
  return false;
}

/**
 * Synchronous canister ID resolver with manual override support.
 * Priority: (1) manual overrides, (2) runtime env.json, (3) build-time Vite env vars.
 */
export function resolveBackendCanisterId(): CanisterIdResolution {
  const sourcesAttempted: string[] = [];
  
  // Priority 1: Manual overrides (URL query or localStorage)
  const manualOverride = getActiveManualOverride();
  if (manualOverride) {
    const source = manualOverride.source === 'url' 
      ? 'manual-override:url' 
      : 'manual-override:localStorage';
    sourcesAttempted.push(source);
    
    return {
      canisterId: manualOverride.canisterId,
      source,
      sourcesAttempted,
    };
  }
  
  // Check if runtime env is still loading
  const loadStatus = (window as any).__ENV_LOAD_STATUS__;
  if (loadStatus === 'loading') {
    return {
      canisterId: null,
      source: 'none',
      sourcesAttempted: ['window.__ENV__.CANISTER_ID_BACKEND'],
      error: 'Runtime env.json is still loading. Please wait or retry.',
    };
  }
  
  // Priority 2: Runtime environment (window.__ENV__.CANISTER_ID_BACKEND from /env.json)
  const runtimeEnv = (window as any).__ENV__;
  if (runtimeEnv && runtimeEnv.CANISTER_ID_BACKEND) {
    sourcesAttempted.push('window.__ENV__.CANISTER_ID_BACKEND');
    const canisterId = runtimeEnv.CANISTER_ID_BACKEND;
    
    // Reject placeholder values
    if (canisterId === PLACEHOLDER_CANISTER_ID) {
      return {
        canisterId: null,
        source: 'none',
        sourcesAttempted,
        error: `Runtime env.json contains placeholder value "${PLACEHOLDER_CANISTER_ID}". Publish via Caffeine editor to inject real canister ID.`,
      };
    }
    
    // Reject empty values
    if (!canisterId || canisterId.trim() === '') {
      return {
        canisterId: null,
        source: 'none',
        sourcesAttempted,
        error: 'Runtime env.json CANISTER_ID_BACKEND is empty. Publish via Caffeine editor to configure.',
      };
    }
    
    return {
      canisterId,
      source: 'window.__ENV__.CANISTER_ID_BACKEND',
      sourcesAttempted,
    };
  }
  
  // Priority 3: Build-time Vite environment variables
  const viteCanisterId = import.meta.env.VITE_CANISTER_ID_BACKEND || import.meta.env.VITE_BACKEND_CANISTER_ID;
  if (viteCanisterId) {
    sourcesAttempted.push('vite-env-vars');
    
    // Reject placeholder values
    if (viteCanisterId === PLACEHOLDER_CANISTER_ID) {
      return {
        canisterId: null,
        source: 'none',
        sourcesAttempted,
        error: `Build-time env contains placeholder value "${PLACEHOLDER_CANISTER_ID}".`,
      };
    }
    
    return {
      canisterId: viteCanisterId,
      source: 'vite-env-vars',
      sourcesAttempted,
    };
  }
  
  sourcesAttempted.push('vite-env-vars');
  
  return {
    canisterId: null,
    source: 'none',
    sourcesAttempted,
    error: 'No backend canister ID found in runtime env.json or build-time environment variables.',
  };
}

/**
 * Async canister ID resolver with runtime env.json wait and manual override support.
 * Waits for runtime env.json to load (with timeout), then tries all sources.
 */
export async function resolveBackendCanisterIdAsync(): Promise<CanisterIdResolution> {
  // Check manual overrides first (they don't require waiting)
  const manualOverride = getActiveManualOverride();
  if (manualOverride) {
    const source = manualOverride.source === 'url' 
      ? 'manual-override:url' 
      : 'manual-override:localStorage';
    
    return {
      canisterId: manualOverride.canisterId,
      source,
      sourcesAttempted: [source],
    };
  }
  
  // Wait for runtime env.json to finish loading (if it's in progress)
  const loadStatus = (window as any).__ENV_LOAD_STATUS__;
  if (loadStatus === 'loading') {
    console.log('[canisterIdResolution] Runtime env.json is loading, waiting...');
    const loaded = await waitForRuntimeEnvLoad(3000);
    if (loaded) {
      console.log('[canisterIdResolution] Runtime env.json loaded successfully');
    } else {
      console.warn('[canisterIdResolution] Runtime env.json did not load within timeout');
    }
  }
  
  // Now try sync resolution
  const syncResolution = resolveBackendCanisterId();
  
  // If sync resolution succeeded, return it
  if (syncResolution.canisterId) {
    return syncResolution;
  }
  
  // Try declarations fallback (informational only - declarations don't export canisterId)
  const sourcesAttempted = [...syncResolution.sourcesAttempted];
  sourcesAttempted.push('checked-in-declarations');
  
  // Declarations module doesn't export canisterId, so we can't use it as a fallback
  // This is just for tracking that we attempted this source
  
  return {
    canisterId: null,
    source: 'none',
    sourcesAttempted,
    error: syncResolution.error || 'No backend canister ID found in any source.',
  };
}

/**
 * Helper that throws if canister ID cannot be resolved.
 * Used by actor initialization to fail fast with clear error.
 */
export async function getBackendCanisterIdOrThrowAsync(): Promise<string> {
  const resolution = await resolveBackendCanisterIdAsync();
  
  if (!resolution.canisterId) {
    const sourcesStr = resolution.sourcesAttempted.join(', ');
    throw new Error(
      `Backend canister ID not resolved. Attempted sources: ${sourcesStr}. ${resolution.error || 'No canister ID available.'}`
    );
  }
  
  return resolution.canisterId;
}
