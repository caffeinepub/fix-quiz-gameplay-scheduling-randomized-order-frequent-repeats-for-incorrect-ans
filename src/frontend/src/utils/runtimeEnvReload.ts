// Runtime /env.json reload helper
// Re-fetches /env.json and updates window.__ENV__ and window.__ENV_LOAD_STATUS__

export interface RuntimeEnvReloadResult {
  success: boolean;
  message: string;
  canisterId: string | null;
}

/**
 * Re-fetches /env.json from the server and updates the runtime environment.
 * Returns a structured result suitable for UI messaging with explicit placeholder/empty detection.
 */
export async function reloadRuntimeEnv(): Promise<RuntimeEnvReloadResult> {
  console.log('[runtimeEnvReload] Starting runtime env.json reload...');
  
  try {
    // Set loading status
    (window as any).__ENV_LOAD_STATUS__ = 'loading';
    
    // Fetch with cache-busting timestamp and no-store semantics
    const timestamp = Date.now();
    const response = await fetch(`/env.json?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        (window as any).__ENV_LOAD_STATUS__ = 'missing';
        (window as any).__ENV__ = {};
        console.error('[runtimeEnvReload] /env.json not found (404)');
        return {
          success: false,
          message: '❌ /env.json file not found. The file must be created during the publish process via Caffeine editor.',
          canisterId: null,
        };
      }
      
      (window as any).__ENV_LOAD_STATUS__ = 'error';
      (window as any).__ENV__ = {};
      console.error('[runtimeEnvReload] Failed to fetch /env.json:', response.status, response.statusText);
      return {
        success: false,
        message: `❌ Failed to fetch /env.json: ${response.status} ${response.statusText}. Ensure the file exists and is accessible.`,
        canisterId: null,
      };
    }
    
    // Parse JSON
    const envData = await response.json();
    
    // Update window.__ENV__
    (window as any).__ENV__ = envData;
    (window as any).__ENV_LOAD_STATUS__ = 'loaded';
    
    const canisterId = envData.CANISTER_ID_BACKEND || null;
    
    console.log('[runtimeEnvReload] Successfully reloaded /env.json');
    console.log('[runtimeEnvReload] CANISTER_ID_BACKEND:', canisterId || '(not set)');
    
    // Check if it's still a placeholder
    if (canisterId === 'PLACEHOLDER_BACKEND_CANISTER_ID') {
      return {
        success: false,
        message: '⚠️ /env.json still contains placeholder value "PLACEHOLDER_BACKEND_CANISTER_ID". Publish via Caffeine editor to inject real canister ID.',
        canisterId: null,
      };
    }
    
    // Check if it's empty
    if (!canisterId || canisterId.trim() === '') {
      return {
        success: false,
        message: '⚠️ /env.json loaded but CANISTER_ID_BACKEND is not set. Publish via Caffeine editor to configure backend connection.',
        canisterId: null,
      };
    }
    
    return {
      success: true,
      message: `✓ Runtime configuration reloaded successfully. Backend canister ID is now available: ${canisterId}`,
      canisterId,
    };
    
  } catch (error: any) {
    (window as any).__ENV_LOAD_STATUS__ = 'error';
    (window as any).__ENV__ = {};
    
    console.error('[runtimeEnvReload] Error reloading /env.json:', error);
    
    return {
      success: false,
      message: `❌ Error reloading /env.json: ${error.message || 'Unknown error'}. Check browser console for details.`,
      canisterId: null,
    };
  }
}
