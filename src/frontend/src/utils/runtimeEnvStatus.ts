// Runtime environment configuration inspection
// Helps troubleshoot missing or incomplete env.json configuration

export interface RuntimeEnvStatus {
  envJsonAccessible: boolean;
  canisterIdPresent: boolean;
  message: string;
  troubleshootingSteps: string[];
}

/**
 * Inspects runtime environment configuration and provides troubleshooting guidance.
 * Checks window.__ENV__ and attempts to determine if /env.json is accessible.
 */
export async function inspectRuntimeEnv(): Promise<RuntimeEnvStatus> {
  const envJson = window.__ENV__;
  const loadStatus = window.__ENV_LOAD_STATUS__;
  const canisterIdValue = envJson?.CANISTER_ID_BACKEND;
  const canisterIdPresent = !!(canisterIdValue && typeof canisterIdValue === 'string' && canisterIdValue.trim());

  // Check load status first (set by index.html pre-bootstrap script)
  if (loadStatus === 'missing') {
    return {
      envJsonAccessible: false,
      canisterIdPresent: false,
      message: 'Runtime environment configuration is not loaded. The /env.json file is missing or unreachable.',
      troubleshootingSteps: [
        'Ensure /env.json exists in the deployed frontend assets.',
        'Verify that /env.json is accessible from the browser (check network tab).',
        'For live deployments, /env.json must contain a non-empty CANISTER_ID_BACKEND value.',
      ],
    };
  }

  if (loadStatus === 'error') {
    return {
      envJsonAccessible: false,
      canisterIdPresent: false,
      message: 'Runtime environment configuration failed to load. The /env.json file is unreachable or invalid.',
      troubleshootingSteps: [
        'Check that /env.json contains valid JSON.',
        'Verify that /env.json is accessible from the browser (check network tab).',
        'For live deployments, /env.json must contain a non-empty CANISTER_ID_BACKEND value.',
      ],
    };
  }

  // Check if window.__ENV__ exists at all
  if (!envJson) {
    // Try to fetch /env.json with cache-busting to see if it's accessible
    let envJsonAccessible = false;
    try {
      const response = await fetch(`/env.json?cb=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      envJsonAccessible = response.ok;
    } catch (e) {
      envJsonAccessible = false;
    }

    if (!envJsonAccessible) {
      return {
        envJsonAccessible: false,
        canisterIdPresent: false,
        message: 'Runtime environment configuration is not loaded. The /env.json file is missing or unreachable.',
        troubleshootingSteps: [
          'Ensure /env.json exists in the deployed frontend assets.',
          'Verify that /env.json is accessible from the browser (check network tab).',
          'For live deployments, /env.json must contain a non-empty CANISTER_ID_BACKEND value.',
        ],
      };
    }

    return {
      envJsonAccessible: true,
      canisterIdPresent: false,
      message: 'Runtime environment is loaded but appears empty. The /env.json file exists but window.__ENV__ is not populated.',
      troubleshootingSteps: [
        'Check that /env.json contains valid JSON.',
        'Verify that the pre-bootstrap script in index.html is loading /env.json correctly.',
        'Ensure CANISTER_ID_BACKEND is defined in /env.json with a non-empty value.',
      ],
    };
  }

  // window.__ENV__ exists
  if (!canisterIdPresent) {
    return {
      envJsonAccessible: true,
      canisterIdPresent: false,
      message: 'Runtime environment is loaded, but CANISTER_ID_BACKEND is missing or empty in window.__ENV__.',
      troubleshootingSteps: [
        'Add CANISTER_ID_BACKEND to /env.json with your backend canister ID (non-empty value).',
        'For live deployments, this key is required for the app to connect to the backend.',
        'Example: { "CANISTER_ID_BACKEND": "your-canister-id-here" }',
      ],
    };
  }

  // All good
  return {
    envJsonAccessible: true,
    canisterIdPresent: true,
    message: 'Runtime environment is correctly configured.',
    troubleshootingSteps: [],
  };
}

/**
 * Synchronous check for immediate UI feedback.
 * Returns basic status without async fetch.
 */
export function getRuntimeEnvStatusSync(): Pick<RuntimeEnvStatus, 'canisterIdPresent' | 'message'> {
  const envJson = window.__ENV__;
  const loadStatus = window.__ENV_LOAD_STATUS__;
  const canisterIdValue = envJson?.CANISTER_ID_BACKEND;
  const canisterIdPresent = !!(canisterIdValue && typeof canisterIdValue === 'string' && canisterIdValue.trim());

  if (loadStatus === 'missing' || loadStatus === 'error') {
    return {
      canisterIdPresent: false,
      message: 'Runtime environment (window.__ENV__) is not loaded or failed to load. Check that /env.json is accessible with a non-empty CANISTER_ID_BACKEND.',
    };
  }

  if (!envJson) {
    return {
      canisterIdPresent: false,
      message: 'Runtime environment (window.__ENV__) is not loaded. Check that /env.json is accessible.',
    };
  }

  if (!canisterIdPresent) {
    return {
      canisterIdPresent: false,
      message: 'CANISTER_ID_BACKEND is missing or empty in window.__ENV__. Add a non-empty value to /env.json for live deployments.',
    };
  }

  return {
    canisterIdPresent: true,
    message: 'Runtime environment is correctly configured.',
  };
}
