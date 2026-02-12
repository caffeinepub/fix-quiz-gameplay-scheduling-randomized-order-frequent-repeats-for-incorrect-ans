// Runtime environment configuration inspection
// Helps troubleshoot missing or incomplete env.json configuration

const PLACEHOLDER_CANISTER_ID = 'PLACEHOLDER_BACKEND_CANISTER_ID';

export interface RuntimeEnvStatus {
  envJsonAccessible: boolean;
  canisterIdPresent: boolean;
  message: string;
  troubleshootingSteps: string[];
}

/**
 * Checks if a canister ID value is valid (non-empty, not whitespace, and not a placeholder).
 */
function isValidCanisterId(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === PLACEHOLDER_CANISTER_ID) return false;
  return true;
}

/**
 * Inspects runtime environment configuration and provides troubleshooting guidance.
 * Checks window.__ENV__ and attempts to determine if /env.json is accessible.
 */
export async function inspectRuntimeEnv(): Promise<RuntimeEnvStatus> {
  const envJson = window.__ENV__;
  const loadStatus = window.__ENV_LOAD_STATUS__;
  const canisterIdValue = envJson?.CANISTER_ID_BACKEND;
  const canisterIdPresent = isValidCanisterId(canisterIdValue);

  // Check load status first (set by index.html pre-bootstrap script)
  if (loadStatus === 'missing') {
    return {
      envJsonAccessible: false,
      canisterIdPresent: false,
      message: 'Runtime environment configuration is not loaded. The /env.json file is missing or unreachable.',
      troubleshootingSteps: [
        'Ensure /env.json exists in the deployed frontend assets.',
        'Verify that /env.json is accessible from the browser (check network tab).',
        `For live deployments, /env.json must contain a valid, non-placeholder CANISTER_ID_BACKEND value.`,
        `The placeholder "${PLACEHOLDER_CANISTER_ID}" must be replaced with your actual backend canister ID.`,
        'Publishing via the Caffeine editor should automatically replace the placeholder.',
        'Example: { "CANISTER_ID_BACKEND": "rrkah-fqaaa-aaaaa-aaaaq-cai" }',
      ],
    };
  }

  if (loadStatus === 'error') {
    return {
      envJsonAccessible: false,
      canisterIdPresent: false,
      message: 'Runtime environment configuration failed to load. The /env.json file is unreachable or contains invalid JSON.',
      troubleshootingSteps: [
        'Check that /env.json contains valid JSON syntax.',
        'Verify that /env.json is accessible from the browser (check network tab).',
        `Ensure CANISTER_ID_BACKEND is set to your actual backend canister ID (not "${PLACEHOLDER_CANISTER_ID}").`,
        'Publishing via the Caffeine editor should automatically configure this.',
        'Example: { "CANISTER_ID_BACKEND": "rrkah-fqaaa-aaaaa-aaaaq-cai" }',
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
          `For live deployments, /env.json must contain a valid CANISTER_ID_BACKEND value (not "${PLACEHOLDER_CANISTER_ID}").`,
          'Publishing via the Caffeine editor should automatically configure this.',
          'Example: { "CANISTER_ID_BACKEND": "rrkah-fqaaa-aaaaa-aaaaq-cai" }',
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
        `Ensure CANISTER_ID_BACKEND is defined in /env.json with a valid value (not "${PLACEHOLDER_CANISTER_ID}").`,
        'Publishing via the Caffeine editor should automatically configure this.',
        'Example: { "CANISTER_ID_BACKEND": "rrkah-fqaaa-aaaaa-aaaaq-cai" }',
      ],
    };
  }

  // window.__ENV__ exists
  if (!canisterIdPresent) {
    const trimmedValue = canisterIdValue?.trim();
    if (trimmedValue === PLACEHOLDER_CANISTER_ID) {
      return {
        envJsonAccessible: true,
        canisterIdPresent: false,
        message: `Runtime environment is loaded, but CANISTER_ID_BACKEND contains the placeholder value "${PLACEHOLDER_CANISTER_ID}".`,
        troubleshootingSteps: [
          `The placeholder value "${PLACEHOLDER_CANISTER_ID}" must be replaced with your actual backend canister ID.`,
          'This should be done automatically by the Caffeine editor during publish.',
          'If publishing via Caffeine editor, ensure the deployment configuration includes the backend canister ID.',
          'Update /env.json with your real backend canister ID before the app can connect.',
          'Example: { "CANISTER_ID_BACKEND": "rrkah-fqaaa-aaaaa-aaaaq-cai" }',
          'See PUBLISHING.md for detailed instructions.',
        ],
      };
    }
    
    return {
      envJsonAccessible: true,
      canisterIdPresent: false,
      message: 'Runtime environment is loaded, but CANISTER_ID_BACKEND is missing or empty in window.__ENV__.',
      troubleshootingSteps: [
        `Add CANISTER_ID_BACKEND to /env.json with your backend canister ID (not "${PLACEHOLDER_CANISTER_ID}").`,
        'For live deployments, this key is required for the app to connect to the backend.',
        'Publishing via the Caffeine editor should automatically configure this.',
        'Example: { "CANISTER_ID_BACKEND": "rrkah-fqaaa-aaaaa-aaaaq-cai" }',
        'If publishing via Caffeine editor, ensure the deployment configuration includes the backend canister ID.',
        'See PUBLISHING.md for detailed instructions.',
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
  const canisterIdPresent = isValidCanisterId(canisterIdValue);

  if (loadStatus === 'missing' || loadStatus === 'error') {
    return {
      canisterIdPresent: false,
      message: `Runtime environment (window.__ENV__) is not loaded or failed to load. Check that /env.json is accessible and contains a valid CANISTER_ID_BACKEND (not "${PLACEHOLDER_CANISTER_ID}"). Publishing via Caffeine editor should configure this automatically.`,
    };
  }

  if (!envJson) {
    return {
      canisterIdPresent: false,
      message: 'Runtime environment (window.__ENV__) is not loaded. Check that /env.json is accessible and properly configured via Caffeine editor publish.',
    };
  }

  if (!canisterIdPresent) {
    const trimmedValue = canisterIdValue?.trim();
    if (trimmedValue === PLACEHOLDER_CANISTER_ID) {
      return {
        canisterIdPresent: false,
        message: `CANISTER_ID_BACKEND contains the placeholder value "${PLACEHOLDER_CANISTER_ID}" in window.__ENV__. This must be replaced with your actual backend canister ID during Caffeine editor publish. See PUBLISHING.md for details.`,
      };
    }
    
    return {
      canisterIdPresent: false,
      message: `CANISTER_ID_BACKEND is missing or empty in window.__ENV__. Add a valid value (not "${PLACEHOLDER_CANISTER_ID}") to /env.json via Caffeine editor publish. See PUBLISHING.md for details.`,
    };
  }

  return {
    canisterIdPresent: true,
    message: 'Runtime environment is correctly configured.',
  };
}
