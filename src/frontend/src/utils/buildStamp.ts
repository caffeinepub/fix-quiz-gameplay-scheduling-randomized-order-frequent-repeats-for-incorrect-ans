// Build stamp utility for deployment diagnostics
// Exposes build metadata for verification and debugging

export interface BuildStamp {
  timestamp: string;
  version: string;
  environment: string;
  deploymentId: string;
}

// Stable deployment ID cached for the session
let cachedDeploymentId: string | null = null;

/**
 * Get a stable deployment ID for this session.
 * Prefers build-time injected VITE_DEPLOYMENT_ID when available,
 * otherwise generates a session-stable ID.
 */
function getStableDeploymentId(): string {
  if (!cachedDeploymentId) {
    // Try build-time injected deployment ID first
    const buildTimeId = import.meta.env.VITE_DEPLOYMENT_ID;
    if (buildTimeId && typeof buildTimeId === 'string' && buildTimeId.trim()) {
      cachedDeploymentId = buildTimeId.trim();
    } else {
      // Fallback: generate session-stable ID
      cachedDeploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }
  return cachedDeploymentId;
}

/**
 * Get build information for this deployment.
 * Prefers build-time injected environment variables when available,
 * otherwise generates session-stable fallbacks.
 */
export function getBuildInfo(): BuildStamp {
  // Try build-time injected timestamp first
  const buildTimeTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP;
  const timestamp = buildTimeTimestamp && typeof buildTimeTimestamp === 'string' && buildTimeTimestamp.trim()
    ? buildTimeTimestamp.trim()
    : new Date().toISOString();

  // Try build-time injected version first, fallback to 'dev' (not a fixed historic number)
  const buildTimeVersion = import.meta.env.VITE_APP_VERSION;
  const version = buildTimeVersion && typeof buildTimeVersion === 'string' && buildTimeVersion.trim()
    ? buildTimeVersion.trim()
    : 'dev';

  // Determine environment
  const mode = import.meta.env.MODE || 'production';
  const environment = mode === 'development' ? 'development' : 'production';

  return {
    timestamp,
    version,
    environment,
    deploymentId: getStableDeploymentId(),
  };
}
