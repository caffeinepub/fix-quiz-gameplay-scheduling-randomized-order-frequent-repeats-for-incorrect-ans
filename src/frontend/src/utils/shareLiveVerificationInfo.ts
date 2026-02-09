// Share live verification info formatter
// Generates plain-text summary for clipboard sharing

import type { BuildStamp } from './buildStamp';
import type { ConnectionInfo } from './actorConnectionInfo';
import type { HealthCheckResult } from '../backend';

export interface VerificationInfoInput {
  buildInfo: BuildStamp;
  connectionInfo: ConnectionInfo;
  healthCheckResult: HealthCheckResult | null;
  healthCheckError: string | null;
}

/**
 * Formats verification info as plain text for sharing.
 * Includes URL, build metadata, canister ID, and health check status.
 */
export function formatVerificationInfo(input: VerificationInfoInput): string {
  const lines: string[] = [];

  // Header
  lines.push('=== Live Verification Info ===');
  lines.push('');

  // Location
  lines.push('Live URL:');
  lines.push(`  ${window.location.origin}${window.location.pathname}`);
  if (window.location.hash) {
    lines.push(`  Hash: ${window.location.hash}`);
  }
  lines.push('');

  // Build Metadata
  lines.push('Build Metadata:');
  lines.push(`  Version: ${input.buildInfo.version}`);
  lines.push(`  Timestamp: ${input.buildInfo.timestamp}`);
  lines.push(`  Environment: ${input.buildInfo.environment}`);
  lines.push(`  Deployment ID: ${input.buildInfo.deploymentId}`);
  lines.push('');

  // Backend Canister Resolution
  lines.push('Backend Canister Resolution:');
  lines.push(`  Canister ID: ${input.connectionInfo.canisterId || '(not resolved)'}`);
  lines.push(`  Source: ${input.connectionInfo.canisterIdSource}`);
  lines.push(`  Sources Attempted: ${input.connectionInfo.canisterIdSourcesAttempted.join(', ')}`);
  if (input.connectionInfo.canisterIdResolutionError) {
    lines.push(`  Resolution Error: ${input.connectionInfo.canisterIdResolutionError}`);
  }
  lines.push('');

  // Network/Host
  lines.push('Network Configuration:');
  lines.push(`  Network: ${input.connectionInfo.network}`);
  lines.push(`  Host: ${input.connectionInfo.host}`);
  lines.push('');

  // Health Check Status/Result
  lines.push('Health Check Status:');
  if (input.healthCheckResult) {
    lines.push('  Status: SUCCESS');
    lines.push(`  Backend Version: ${input.healthCheckResult.backendVersion.toString()}`);
    lines.push(`  System Time: ${new Date(Number(input.healthCheckResult.systemTime) / 1_000_000).toISOString()}`);
    lines.push('  Result: Backend is reachable and responding correctly');
  } else if (input.healthCheckError) {
    lines.push('  Status: FAILED');
    lines.push(`  Error: ${input.healthCheckError}`);
    lines.push('  Result: Backend connection failed - check canister ID and network configuration');
  } else {
    lines.push('  Status: Not performed');
    lines.push('  Result: Health check has not been run yet');
  }
  lines.push('');

  // Footer
  lines.push(`Generated: ${new Date().toISOString()}`);

  return lines.join('\n');
}
