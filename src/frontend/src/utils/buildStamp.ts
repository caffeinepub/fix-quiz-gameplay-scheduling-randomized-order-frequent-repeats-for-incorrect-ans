/**
 * Build stamp utility that provides deployment metadata with version sourced from VITE_APP_VERSION,
 * preferring build-time injected environment variables over session-generated fallbacks,
 * and exposes a stable build identifier for cross-session update detection.
 */

export interface BuildInfo {
  version: string;
  timestamp: string;
  deploymentId: string;
  environment: string;
  buildId: string; // Stable identifier for detecting new builds
}

let cachedBuildInfo: BuildInfo | null = null;

export function getBuildInfo(): BuildInfo {
  if (cachedBuildInfo) {
    return cachedBuildInfo;
  }

  const version = import.meta.env.VITE_APP_VERSION || 'dev';
  const timestamp = import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString();
  const deploymentId = import.meta.env.VITE_DEPLOYMENT_ID || `session-${Date.now()}`;
  const environment = import.meta.env.MODE || 'development';

  // Create a stable build identifier that changes only when the build changes
  // Use VITE_BUILD_TIMESTAMP if available (set at build time), otherwise fall back to deploymentId
  const buildId = import.meta.env.VITE_BUILD_TIMESTAMP || deploymentId;

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
