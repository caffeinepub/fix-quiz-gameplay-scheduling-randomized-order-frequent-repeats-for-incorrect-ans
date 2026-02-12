// Manual backend canister ID override utilities
// Supports URL query parameter (single-load) and localStorage (persistent) overrides

const STORAGE_KEY = 'manual_backend_canister_id';

/**
 * Validates and sanitizes a canister ID string.
 * Returns the sanitized ID or null if invalid.
 */
export function validateCanisterId(canisterId: string): string | null {
  if (!canisterId) return null;
  
  const trimmed = canisterId.trim();
  if (trimmed === '') return null;
  
  // Basic validation: should be alphanumeric with hyphens
  // IC canister IDs are typically base32-like strings with hyphens
  const validPattern = /^[a-zA-Z0-9-]+$/;
  if (!validPattern.test(trimmed)) {
    return null;
  }
  
  // Reject placeholder values
  if (trimmed === 'PLACEHOLDER_BACKEND_CANISTER_ID') {
    return null;
  }
  
  return trimmed;
}

/**
 * Reads the backendCanisterId query parameter from the current URL.
 * Returns the validated canister ID or null.
 */
export function getUrlQueryOverride(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const rawValue = params.get('backendCanisterId');
    if (!rawValue) return null;
    
    return validateCanisterId(rawValue);
  } catch (error) {
    console.error('[manualOverride] Error reading URL query parameter:', error);
    return null;
  }
}

/**
 * Gets the persisted override from localStorage.
 * Returns the validated canister ID or null.
 */
export function getPersistedOverride(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    return validateCanisterId(stored);
  } catch (error) {
    console.error('[manualOverride] Error reading from localStorage:', error);
    return null;
  }
}

/**
 * Saves a canister ID override to localStorage.
 * Returns true if successful, false otherwise.
 */
export function setPersistedOverride(canisterId: string): boolean {
  const validated = validateCanisterId(canisterId);
  if (!validated) {
    console.error('[manualOverride] Invalid canister ID, not saving:', canisterId);
    return false;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, validated);
    console.log('[manualOverride] Saved override to localStorage:', validated);
    return true;
  } catch (error) {
    console.error('[manualOverride] Error saving to localStorage:', error);
    return false;
  }
}

/**
 * Clears the persisted override from localStorage.
 */
export function clearPersistedOverride(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[manualOverride] Cleared persisted override');
  } catch (error) {
    console.error('[manualOverride] Error clearing localStorage:', error);
  }
}

/**
 * Gets the active manual override (URL query takes precedence over localStorage).
 * Returns { canisterId, source } or null if no override is active.
 */
export function getActiveManualOverride(): { canisterId: string; source: 'url' | 'localStorage' } | null {
  // Priority 1: URL query parameter (single-load)
  const urlOverride = getUrlQueryOverride();
  if (urlOverride) {
    return { canisterId: urlOverride, source: 'url' };
  }
  
  // Priority 2: Persisted localStorage
  const persistedOverride = getPersistedOverride();
  if (persistedOverride) {
    return { canisterId: persistedOverride, source: 'localStorage' };
  }
  
  return null;
}
