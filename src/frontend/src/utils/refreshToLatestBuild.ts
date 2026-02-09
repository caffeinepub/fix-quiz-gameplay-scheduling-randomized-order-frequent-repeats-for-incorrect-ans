// Hard refresh utility with cache-busting, storage clearing, and service worker unregistration
// Forces browser to fetch latest static assets without clearing backend data

import { diagnostics } from './deploymentDiagnostics';

/**
 * Performs a comprehensive hard refresh:
 * 1. Clears app-owned localStorage/sessionStorage keys (diagnostics, drafts)
 * 2. Unregisters service workers and clears caches (best-effort)
 * 3. Reloads with cache-busting URL parameter to force fresh asset fetch
 */
export async function refreshToLatestBuild(): Promise<void> {
  const errors: string[] = [];

  // Step 1: Clear app-owned storage keys
  try {
    // Clear deployment diagnostics
    localStorage.removeItem('deployment-diagnostics');
    
    // Clear quiz drafts (pattern: quiz-draft-*)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('quiz-draft-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear session storage diagnostics if any
    sessionStorage.removeItem('deployment-diagnostics');
    sessionStorage.removeItem('adminToken');
  } catch (error: any) {
    const msg = `Storage clear failed: ${error.message}`;
    errors.push(msg);
    console.warn(msg, error);
  }

  // Step 2: Unregister service workers and clear caches (best-effort)
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const unregisterPromises = registrations.map(reg => 
        reg.unregister().catch(err => {
          const msg = `Service worker unregister failed: ${err.message}`;
          errors.push(msg);
          console.warn(msg, err);
          return false;
        })
      );
      await Promise.all(unregisterPromises);
      
      // Clear service worker caches
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (cacheError: any) {
          const msg = `Cache clear failed: ${cacheError.message}`;
          errors.push(msg);
          console.warn(msg, cacheError);
        }
      }
    } catch (error: any) {
      const msg = `Service worker operations failed: ${error.message}`;
      errors.push(msg);
      console.warn(msg, error);
    }
  }

  // Record any errors encountered during the refresh flow
  if (errors.length > 0) {
    diagnostics.captureError(
      `Hard refresh encountered issues: ${errors.join('; ')}`,
      'refreshToLatestBuild - Pre-reload cleanup',
      'runtime'
    );
  }

  // Step 3: Reload with cache-busting parameter to force fresh asset fetch
  const url = new URL(window.location.href);
  url.searchParams.set('cb', Date.now().toString());
  
  // Force reload to the new URL
  window.location.href = url.toString();
}
