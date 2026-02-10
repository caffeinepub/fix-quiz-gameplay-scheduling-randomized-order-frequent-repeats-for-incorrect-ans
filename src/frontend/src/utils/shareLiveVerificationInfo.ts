import { getActorConnectionInfoAsync } from './actorConnectionInfo';
import type { BuildInfo } from './buildStamp';
import type { HealthCheckResult } from '../backend';

export async function shareLiveVerificationInfo(
  buildInfo: BuildInfo,
  healthCheckResult: HealthCheckResult | null = null,
  healthCheckError: string | null = null
): Promise<string> {
  const connectionInfo = await getActorConnectionInfoAsync();
  
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push('LIVE VERIFICATION INFO');
  lines.push('='.repeat(60));
  lines.push('');
  
  lines.push('Live URL:');
  lines.push(`  ${window.location.href}`);
  lines.push('');
  
  lines.push('Build Information:');
  lines.push(`  Version: ${buildInfo.version}`);
  lines.push(`  Timestamp: ${buildInfo.timestamp}`);
  lines.push(`  Deployment ID: ${buildInfo.deploymentId}`);
  lines.push(`  Environment: ${buildInfo.environment}`);
  lines.push('');
  
  lines.push('Backend Canister:');
  if (connectionInfo.canisterId) {
    lines.push(`  Canister ID: ${connectionInfo.canisterId}`);
    lines.push(`  Resolution Method: ${connectionInfo.canisterIdSource}`);
  } else {
    lines.push('  Canister ID: (not resolved)');
    if (connectionInfo.canisterIdResolutionError) {
      lines.push(`  Error: ${connectionInfo.canisterIdResolutionError}`);
    }
  }
  lines.push('');
  
  lines.push('Network Configuration:');
  lines.push(`  Network: ${connectionInfo.network}`);
  lines.push(`  Host: ${connectionInfo.host}`);
  lines.push('');
  
  lines.push('Health Check:');
  if (healthCheckResult) {
    lines.push('  Status: Success');
    lines.push(`  Backend Version: ${healthCheckResult.backendVersion}`);
    lines.push(`  System Time: ${new Date(Number(healthCheckResult.systemTime) / 1_000_000).toISOString()}`);
  } else if (healthCheckError) {
    lines.push('  Status: Failed');
    lines.push(`  Error: ${healthCheckError}`);
  } else {
    lines.push('  Status: Not checked');
  }
  lines.push('');
  
  lines.push('Overall Status:');
  if (connectionInfo.canisterId && healthCheckResult) {
    lines.push('  ✓ Ready');
  } else {
    lines.push('  ✗ Not Ready');
    if (!connectionInfo.canisterId) {
      lines.push('  - Backend canister ID not configured');
    }
    if (!healthCheckResult && healthCheckError) {
      lines.push('  - Backend health check failed');
    }
  }
  lines.push('');
  
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}
