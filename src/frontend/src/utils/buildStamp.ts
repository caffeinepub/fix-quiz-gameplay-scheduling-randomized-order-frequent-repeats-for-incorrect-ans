// Build stamp utility for deployment diagnostics
// Exposes build metadata for verification and debugging

export interface BuildStamp {
  timestamp: string;
  version: string;
  environment: string;
  deploymentId: string;
}

// Stable deployment ID for the session
let cachedDeploymentId: string | null = null;

function getStableDeploymentId(): string {
  if (!cachedDeploymentId) {
    cachedDeploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  return cachedDeploymentId;
}

function getBuildStamp(): BuildStamp {
  return {
    timestamp: import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString(),
    version: import.meta.env.VITE_APP_VERSION || '1.0.2',
    environment: import.meta.env.MODE || 'development',
    deploymentId: getStableDeploymentId(),
  };
}

export function logBuildStamp(): void {
  const stamp = getBuildStamp();
  console.log(
    '%c🚀 Build Info - Fresh Deployment',
    'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
    stamp
  );
  console.log(`Build Timestamp: ${stamp.timestamp}`);
  console.log(`Version: ${stamp.version}`);
  console.log(`Environment: ${stamp.environment}`);
  console.log(`Deployment ID: ${stamp.deploymentId}`);
}

export function getBuildInfo(): BuildStamp {
  return getBuildStamp();
}
