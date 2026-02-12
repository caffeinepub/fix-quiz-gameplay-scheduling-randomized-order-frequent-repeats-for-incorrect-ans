import { Actor, HttpAgent } from '@dfinity/agent';
import type { backendInterface } from '../backend';
import { getBackendCanisterIdOrThrowAsync } from '../utils/canisterIdResolution';

// Get agent host based on environment
function getAgentHost(): string {
  // Check if we're in local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:4943`;
  }

  // Production: use IC mainnet gateway
  return 'https://icp-api.io';
}

export interface ActorOptions {
  agentOptions?: {
    identity?: any;
    host?: string;
  };
}

// Cache for idlFactory to avoid repeated dynamic imports
let idlFactoryCache: any = null;

async function loadIdlFactory(): Promise<any> {
  if (idlFactoryCache) {
    return idlFactoryCache;
  }

  try {
    // Try to load from checked-in declarations first (production builds)
    const checkedInModule = await import('../declarations/backend/index.js');
    if (checkedInModule.idlFactory) {
      idlFactoryCache = checkedInModule.idlFactory;
      return idlFactoryCache;
    }
  } catch (error) {
    // Checked-in declarations not available, that's expected for some builds
    console.warn('Checked-in declarations not found, this is expected if using dfx-generated declarations');
  }

  // If checked-in declarations failed, we cannot proceed in production
  // The checked-in declarations should always be present
  throw new Error(
    'Backend declarations not found. The checked-in declarations at frontend/src/declarations/backend/index.ts are required for production builds.'
  );
}

export async function createActorWithConfig(options?: ActorOptions): Promise<backendInterface> {
  // Use the async resolver which includes declarations fallback
  const canisterId = await getBackendCanisterIdOrThrowAsync();
  const host = options?.agentOptions?.host || getAgentHost();
  const idlFactory = await loadIdlFactory();

  const agent = new HttpAgent({
    host,
    ...options?.agentOptions,
  });

  // Fetch root key for certificate validation during local development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    try {
      await agent.fetchRootKey();
    } catch (err) {
      console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
      console.error(err);
    }
  }

  // Create and return the actor
  return Actor.createActor<backendInterface>(idlFactory, {
    agent,
    canisterId,
  });
}

// Alias for convenience
export const createActor = createActorWithConfig;

export async function getConnectionInfo(): Promise<{ host: string; canisterId: string | null }> {
  try {
    const canisterId = await getBackendCanisterIdOrThrowAsync();
    const host = getAgentHost();
    return { host, canisterId };
  } catch (e) {
    return { host: getAgentHost(), canisterId: null };
  }
}
