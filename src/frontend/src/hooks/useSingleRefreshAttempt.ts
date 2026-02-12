import { useState, useCallback } from 'react';
import { refreshToLatestBuild } from '../utils/refreshToLatestBuild';

// Module-level flag to prevent multiple refresh attempts across component instances
let refreshInProgress = false;

/**
 * Custom hook that provides a guarded refresh mechanism to prevent multiple
 * refresh attempts within the same page session.
 * 
 * Returns:
 * - isRefreshing: boolean flag indicating refresh is in progress
 * - triggerRefresh: function that initiates a single refresh attempt
 */
export function useSingleRefreshAttempt() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = useCallback(async () => {
    // Prevent multiple refresh attempts
    if (refreshInProgress || isRefreshing) {
      console.log('Refresh already in progress, ignoring duplicate request');
      return;
    }

    // Set flags
    refreshInProgress = true;
    setIsRefreshing(true);

    try {
      await refreshToLatestBuild();
      // Note: If successful, page will reload and this code won't execute
    } catch (error) {
      console.error('Refresh failed:', error);
      // Reset flags on error so user can try again
      refreshInProgress = false;
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  return {
    isRefreshing,
    triggerRefresh,
  };
}
