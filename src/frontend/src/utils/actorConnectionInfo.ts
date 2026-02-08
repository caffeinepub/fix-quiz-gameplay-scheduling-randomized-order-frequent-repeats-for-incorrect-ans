export interface ConnectionInfo {
  host: string;
  canisterId: string | null;
  network: string;
}

// Get canister ID from environment or env.json
function getCanisterId(): string | null {
  // Try environment variables first (set by build process)
  if (typeof process !== 'undefined' && process.env) {
    const envCanisterId = 
      process.env.CANISTER_ID_BACKEND ||
      process.env.BACKEND_CANISTER_ID;
    if (envCanisterId) {
      return envCanisterId;
    }
  }

  // Try to load from env.json (deployed apps)
  try {
    // @ts-ignore - env.json is generated at build time
    const envJson = window.__ENV__;
    if (envJson?.CANISTER_ID_BACKEND) {
      return envJson.CANISTER_ID_BACKEND;
    }
  } catch (e) {
    // env.json not available
  }

  // Fallback: try to extract from current URL (for ic0.app/icp0.io domains)
  const hostname = window.location.hostname;
  const icDomainMatch = hostname.match(/^([a-z0-9-]+)\.(ic0\.app|icp0\.io|localhost)$/);
  if (icDomainMatch) {
    return icDomainMatch[1];
  }

  return null;
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
  const canisterId = getCanisterId();
  
  // Determine network name from host
  let network = 'unknown';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    network = 'local';
  } else if (host.includes('icp-api.io') || host.includes('ic0.app') || host.includes('icp0.io')) {
    network = 'mainnet';
  }

  return {
    host,
    canisterId,
    network,
  };
}
