import { useState, useEffect } from 'react';
import { getBuildInfo } from '../utils/buildStamp';
import { shouldAutoMarkBuildAsSeen } from '../utils/refreshToLatestBuild';

const LAST_SEEN_BUILD_KEY = 'quizmaster_last_seen_build_id';

/**
 * Custom React hook that detects pending updates by comparing the current stable build ID
 * against the last seen build ID stored in localStorage.
 * 
 * Enhanced detection:
 * - Re-checks on tab visibility changes and window focus events
 * - Supports auto-mark-seen mechanism after hard refresh
 * - Returns updateAvailable boolean and markCurrentBuildAsSeen helper
 * 
 * CRITICAL: Now uses stable buildId from getBuildInfo() which does not change on every
 * page load when runtime metadata is missing, preventing false update detection.
 */
export function usePendingUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const buildInfo = getBuildInfo();
  const currentBuildId = buildInfo.buildId;

  const checkForUpdate = () => {
    try {
      // Check if we should auto-mark this build as seen (after hard refresh)
      if (shouldAutoMarkBuildAsSeen()) {
        localStorage.setItem(LAST_SEEN_BUILD_KEY, currentBuildId);
        setUpdateAvailable(false);
        return;
      }

      const lastSeenBuildId = localStorage.getItem(LAST_SEEN_BUILD_KEY);
      
      // If no last seen build, mark current as seen (first visit)
      if (!lastSeenBuildId) {
        localStorage.setItem(LAST_SEEN_BUILD_KEY, currentBuildId);
        setUpdateAvailable(false);
        return;
      }

      // If build ID changed, show update banner
      if (lastSeenBuildId !== currentBuildId) {
        setUpdateAvailable(true);
      } else {
        setUpdateAvailable(false);
      }
    } catch (e) {
      console.warn('Failed to check for updates:', e);
      setUpdateAvailable(false);
    }
  };

  // Check on mount
  useEffect(() => {
    checkForUpdate();
  }, [currentBuildId]);

  // Re-check when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentBuildId]);

  // Re-check when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      checkForUpdate();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentBuildId]);

  const markCurrentBuildAsSeen = () => {
    try {
      localStorage.setItem(LAST_SEEN_BUILD_KEY, currentBuildId);
      setUpdateAvailable(false);
    } catch (e) {
      console.warn('Failed to mark build as seen:', e);
    }
  };

  return {
    updateAvailable,
    markCurrentBuildAsSeen,
  };
}
