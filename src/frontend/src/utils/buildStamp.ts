/**
 * Build stamp utility that provides deployment metadata, prioritizing runtime env.json values
 * for live deployments to ensure newly published builds reflect correct metadata,
 * with fallback to build-time environment variables for development,
 * and exposes a stable buildId identifier for cross-session update detection.
 */

export interface BuildInfo {
  version: string;
  timestamp: string;
  deploymentId: string;
  environment: string;
  buildId: string; // Stable identifier for detecting new builds
}

let cachedBuildInfo: BuildInfo | null = null;

/**
 * Checks if a value is a valid non-dev build metadata value.
 * Returns false for empty, whitespace-only, or dev-like values.
 */
function isValidBuildValue(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === 'dev' || trimmed === 'development') return false;
  return true;
}

export function getBuildInfo(): BuildInfo {
  if (cachedBuildInfo) {
    return cachedBuildInfo;
  }

  // For live deployments, prioritize runtime window.__ENV__ values over build-time values
  // This ensures that newly published builds reflect the correct metadata from env.json
  
  // Version: Prefer runtime, then build-time, then fallback to 'dev'
  const version = 
    (isValidBuildValue(window.__ENV__?.BUILD_VERSION) ? window.__ENV__!.BUILD_VERSION : undefined) ||
    import.meta.env.VITE_APP_VERSION || 
    import.meta.env.VITE_BUILD_VERSION ||
    'dev';
    
  // Timestamp: Prefer runtime, then build-time, then fallback to current time
  const timestamp = 
    (isValidBuildValue(window.__ENV__?.BUILD_TIMESTAMP) ? window.__ENV__!.BUILD_TIMESTAMP : undefined) ||
    import.meta.env.VITE_BUILD_TIMESTAMP || 
    new Date().toISOString();
    
  // Deployment ID: Prefer runtime, then build-time, then fallback to session ID
  const deploymentId = 
    (isValidBuildValue(window.__ENV__?.DEPLOYMENT_ID) ? window.__ENV__!.DEPLOYMENT_ID : undefined) ||
    import.meta.env.VITE_DEPLOYMENT_ID || 
    `session-${Date.now()}`;
    
  const environment = import.meta.env.MODE || 'development';

  // Create a stable build identifier that changes only when the build changes
  // Prefer runtime BUILD_TIMESTAMP (from env.json), then build-time, then deploymentId
  const buildId = 
    (isValidBuildValue(window.__ENV__?.BUILD_TIMESTAMP) ? window.__ENV__!.BUILD_TIMESTAMP : undefined) ||
    import.meta.env.VITE_BUILD_TIMESTAMP || 
    deploymentId;

  cachedBuildInfo = {
    version,
    timestamp,
    deploymentId,
    environment,
    buildId,
  };

  return cachedBuildInfo;
}

export function getStableBuildId(): string {
  return getBuildInfo().buildId;
}
