/**
 * Build stamp utility that prioritizes runtime window.__ENV__ metadata over build-time
 * environment variables for live deployments, ensuring newly published builds reflect
 * correct version/timestamp/deployment metadata from env.json.
 * 
 * Provides stable buildId for cross-session update detection.
 */

export interface BuildInfo {
  version: string;
  timestamp: string;
  deploymentId: string;
  environment: string;
  buildId: string; // Stable identifier for update detection
}

/**
 * Gets build information, preferring runtime env.json values when available.
 * The buildId is stable and changes only when the deployed build changes.
 * 
 * CRITICAL: When runtime metadata is missing (timestamp/version unknown), we use a
 * fixed constant as buildId so update detection doesn't trigger on every page load.
 */
export function getBuildInfo(): BuildInfo {
  // Try runtime environment first (from env.json loaded at startup)
  const runtimeEnv = typeof window !== 'undefined' ? (window as any).__ENV__ : undefined;
  
  // Prefer runtime values, fallback to build-time values
  const version = runtimeEnv?.VERSION || import.meta.env.VITE_APP_VERSION || 'unknown';
  const timestamp = runtimeEnv?.BUILD_TIMESTAMP || import.meta.env.VITE_BUILD_TIMESTAMP || 'unknown';
  const deploymentId = runtimeEnv?.DEPLOYMENT_ID || import.meta.env.VITE_DEPLOYMENT_ID || 'local';
  const environment = runtimeEnv?.ENVIRONMENT || import.meta.env.VITE_ENVIRONMENT || 'development';
  
  // Build ID: Use timestamp as stable identifier when available
  // When timestamp is unknown, use a fixed constant to prevent false update detection
  const buildId = timestamp !== 'unknown' ? timestamp : 'dev-build-no-metadata';
  
  return {
    version,
    timestamp,
    deploymentId,
    environment,
    buildId,
  };
}

/**
 * Logs build information to console (called once at startup).
 */
export function logBuildStamp(): void {
  const buildInfo = getBuildInfo();
  console.log(
    `%c🚀 Quiz Master %c${buildInfo.version}`,
    'font-weight: bold; font-size: 14px; color: #00d4ff;',
    'font-weight: normal; font-size: 12px; color: #888;'
  );
  console.log(
    `%cBuild: ${buildInfo.deploymentId} | ${buildInfo.timestamp} | ${buildInfo.environment}`,
    'font-size: 11px; color: #666;'
  );
}
