// Runtime environment configuration inspector
// Checks window.__ENV__ status and provides detailed troubleshooting guidance

export interface RuntimeEnvStatus {
  status: 'loaded' | 'missing' | 'error' | 'loading' | 'invalid';
  canisterId: string | null;
  isPlaceholder: boolean;
  message: string;
  troubleshooting: string[];
}

const PLACEHOLDER_CANISTER_ID = 'PLACEHOLDER_BACKEND_CANISTER_ID';

/**
 * Inspects the runtime environment configuration loaded from /env.json
 * and returns a detailed status for diagnostics.
 */
export function getRuntimeEnvStatus(): RuntimeEnvStatus {
  // Check the load status marker set by index.html pre-bootstrap script
  const loadStatus = (window as any).__ENV_LOAD_STATUS__;
  const env = (window as any).__ENV__ || {};
  const canisterId = env.CANISTER_ID_BACKEND || null;

  // Case 1: Still loading
  if (loadStatus === 'loading') {
    return {
      status: 'loading',
      canisterId: null,
      isPlaceholder: false,
      message: 'Runtime environment is still loading',
      troubleshooting: ['Wait for the environment to finish loading', 'If this persists, try reloading the runtime configuration'],
    };
  }

  // Case 2: Missing /env.json
  if (loadStatus === 'missing') {
    return {
      status: 'missing',
      canisterId: null,
      isPlaceholder: false,
      message: '/env.json file not found or not accessible',
      troubleshooting: [
        'The /env.json file is required for live deployments and is automatically created during publish',
        'To publish: Open your project in the Caffeine editor and click "Publish to Live"',
        'The Caffeine editor will deploy your app and inject the correct backend canister ID into /env.json',
        'Do NOT manually edit frontend/public/env.json - the Caffeine editor manages this file during publish',
        'After publishing, verify the deployment using the in-app diagnostics panel',
      ],
    };
  }

  // Case 3: Error loading /env.json
  if (loadStatus === 'error') {
    return {
      status: 'error',
      canisterId: null,
      isPlaceholder: false,
      message: 'Failed to load /env.json (network or parse error)',
      troubleshooting: [
        'Check browser console for detailed error messages',
        'Verify /env.json is valid JSON',
        'Ensure the file is accessible from your deployment',
        'Try reloading the runtime configuration using the "Reload Runtime Config" button',
        'If the issue persists, republish via the Caffeine editor to regenerate /env.json',
      ],
    };
  }

  // Case 4: Loaded but canister ID is missing or empty
  if (!canisterId || canisterId.trim() === '') {
    return {
      status: 'invalid',
      canisterId: null,
      isPlaceholder: false,
      message: 'CANISTER_ID_BACKEND is missing or empty in /env.json',
      troubleshooting: [
        'The /env.json file exists but CANISTER_ID_BACKEND is not set',
        'This typically happens if the file was manually created without proper configuration',
        'Solution: Publish your app via the Caffeine editor',
        'The Caffeine editor will automatically inject the correct backend canister ID during publish',
        'Do NOT manually edit frontend/public/env.json - let the Caffeine editor manage it',
      ],
    };
  }

  // Case 5: Loaded but canister ID is the placeholder value
  if (canisterId === PLACEHOLDER_CANISTER_ID) {
    return {
      status: 'invalid',
      canisterId: PLACEHOLDER_CANISTER_ID,
      isPlaceholder: true,
      message: `CANISTER_ID_BACKEND is set to placeholder value "${PLACEHOLDER_CANISTER_ID}"`,
      troubleshooting: [
        `The /env.json file contains the placeholder value "${PLACEHOLDER_CANISTER_ID}"`,
        'This placeholder must be replaced with your actual backend canister ID',
        'Solution: Publish your app via the Caffeine editor',
        'The Caffeine editor will automatically replace the placeholder with the correct canister ID during publish',
        'Do NOT manually edit frontend/public/env.json - the Caffeine editor manages this file',
        'After publishing, use the "Verify /env.json" button in diagnostics to confirm the real canister ID was injected',
      ],
    };
  }

  // Case 6: Successfully loaded with valid canister ID
  return {
    status: 'loaded',
    canisterId,
    isPlaceholder: false,
    message: 'Runtime environment loaded successfully with valid backend canister ID',
    troubleshooting: [],
  };
}
