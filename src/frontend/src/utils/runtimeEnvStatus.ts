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
  const canisterIdPresent = !!(envJson?.CANISTER_ID_BACKEND);

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
          'For production deployments, /env.json must contain CANISTER_ID_BACKEND.',
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
        'Ensure CANISTER_ID_BACKEND is defined in /env.json.',
      ],
    };
  }

  // window.__ENV__ exists
  if (!canisterIdPresent) {
    return {
      envJsonAccessible: true,
      canisterIdPresent: false,
      message: 'Runtime environment is loaded, but CANISTER_ID_BACKEND is missing from window.__ENV__.',
      troubleshootingSteps: [
        'Add CANISTER_ID_BACKEND to /env.json with your backend canister ID.',
        'For production/live deployments, this key is required for the app to connect to the backend.',
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
  const canisterIdPresent = !!(envJson?.CANISTER_ID_BACKEND);

  if (!envJson) {
    return {
      canisterIdPresent: false,
      message: 'Runtime environment (window.__ENV__) is not loaded. Check that /env.json is accessible.',
    };
  }

  if (!canisterIdPresent) {
    return {
      canisterIdPresent: false,
      message: 'CANISTER_ID_BACKEND is missing from window.__ENV__. Add it to /env.json for production deployments.',
    };
  }

  return {
    canisterIdPresent: true,
    message: 'Runtime environment is correctly configured.',
  };
}
