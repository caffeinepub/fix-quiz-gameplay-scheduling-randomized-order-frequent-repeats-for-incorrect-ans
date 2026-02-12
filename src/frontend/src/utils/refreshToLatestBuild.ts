import { diagnostics } from './deploymentDiagnostics';
import { getBuildInfo } from './buildStamp';

/**
 * Hard refresh utility that performs best-effort cleanup and cache-busting reload.
 * Now includes mechanism to mark the current build as seen after reload to prevent
 * the "New Version Available" banner from persisting, and captures diagnostics on failure.
 */

const STORAGE_PREFIX = 'quizmaster_';
const MARK_SEEN_ON_NEXT_LOAD_KEY = `${STORAGE_PREFIX}mark_build_seen_on_load`;

/**
 * Marks that the current build should be recorded as "seen" on next app load.
 * This prevents the update banner from showing after a successful hard refresh.
 */
export function markBuildAsSeenOnNextLoad(): void {
  try {
    localStorage.setItem(MARK_SEEN_ON_NEXT_LOAD_KEY, 'true');
  } catch (e) {
    console.warn('Failed to set mark-seen flag:', e);
  }
}

/**
 * Checks if the app should auto-mark the current build as seen on this load.
 * Returns true if the flag is set, and clears the flag.
 */
export function shouldAutoMarkBuildAsSeen(): boolean {
  try {
    const shouldMark = localStorage.getItem(MARK_SEEN_ON_NEXT_LOAD_KEY) === 'true';
    if (shouldMark) {
      localStorage.removeItem(MARK_SEEN_ON_NEXT_LOAD_KEY);
    }
    return shouldMark;
  } catch (e) {
    return false;
  }
}

/**
 * Performs a hard refresh with best-effort cleanup:
 * 1. Clears app-owned localStorage keys (diagnostics, drafts, admin tokens)
 * 2. Unregisters service workers and clears their caches
 * 3. Sets a flag to mark the build as seen after reload
 * 4. Reloads with cache-busting to force fresh asset fetch
 * 
 * Captures diagnostics on failure.
 */
export async function refreshToLatestBuild(): Promise<void> {
  const buildInfo = getBuildInfo();
  
  try {
    // Step 1: Mark that we should record the build as seen after reload
    markBuildAsSeenOnNextLoad();

    // Step 2: Clear app-owned storage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        // Keep the mark-seen flag, remove everything else
        if (key !== MARK_SEEN_ON_NEXT_LOAD_KEY) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove ${key}:`, e);
      }
    });

    // Step 3: Unregister service workers and clear caches
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (registration) => {
            try {
              await registration.unregister();
            } catch (e) {
              console.warn('Failed to unregister service worker:', e);
            }
          })
        );
      } catch (e) {
        console.warn('Failed to get service worker registrations:', e);
      }
    }

    // Step 4: Clear caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            try {
              await caches.delete(cacheName);
            } catch (e) {
              console.warn(`Failed to delete cache ${cacheName}:`, e);
            }
          })
        );
      } catch (e) {
        console.warn('Failed to clear caches:', e);
      }
    }

    // Step 5: Reload with cache-busting
    const url = new URL(window.location.href);
    url.searchParams.set('_refresh', Date.now().toString());
    window.location.href = url.toString();
  } catch (error) {
    console.error('Hard refresh failed:', error);
    
    // Capture diagnostics for refresh failure
    diagnostics.captureError(
      error instanceof Error ? error : new Error(String(error)),
      `Hard refresh failed at ${new Date().toISOString()} | Build: ${buildInfo.version} (${buildInfo.deploymentId}) | Environment: ${buildInfo.environment}`,
      'hardRefresh'
    );
    
    // Fallback: simple reload
    window.location.reload();
  }
}
