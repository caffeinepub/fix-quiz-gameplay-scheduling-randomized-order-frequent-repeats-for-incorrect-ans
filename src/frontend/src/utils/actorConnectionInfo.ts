import { resolveBackendCanisterId, type CanisterIdResolution } from './canisterIdResolution';

export interface ConnectionInfo {
  host: string;
  canisterId: string | null;
  network: string;
  canisterIdSource: string;
  canisterIdSourcesAttempted: string[];
  canisterIdResolutionError?: string;
}

// Get agent host based on environment
function getAgentHost(): string {
  // Check if we're in local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:4943`;
  }

  // Production: use IC mainnet gateway
  return 'https://icp-api.io';
}

export function getActorConnectionInfo(): ConnectionInfo {
  const host = getAgentHost();
  const resolution = resolveBackendCanisterId();
  
  // Determine network name from host
  let network = 'unknown';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    network = 'local';
  } else if (host.includes('icp-api.io') || host.includes('ic0.app') || host.includes('icp0.io')) {
    network = 'mainnet';
  }

  return {
    host,
    canisterId: resolution.canisterId,
    network,
    canisterIdSource: resolution.source,
    canisterIdSourcesAttempted: resolution.sourcesAttempted,
    canisterIdResolutionError: resolution.error,
  };
}
