import { useState, useEffect } from 'react';
import { getStableBuildId } from '../utils/buildStamp';

const LAST_SEEN_BUILD_KEY = 'app_last_seen_build_id';

export function usePendingUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const currentBuildId = getStableBuildId();

  useEffect(() => {
    // Check if we have a stored build ID
    const lastSeenBuildId = localStorage.getItem(LAST_SEEN_BUILD_KEY);

    if (!lastSeenBuildId) {
      // First visit - store current build ID
      localStorage.setItem(LAST_SEEN_BUILD_KEY, currentBuildId);
      setUpdateAvailable(false);
      return;
    }

    // Compare stored build ID with current
    if (lastSeenBuildId !== currentBuildId) {
      // New build detected
      setUpdateAvailable(true);
    } else {
      setUpdateAvailable(false);
    }
  }, [currentBuildId]);

  const markCurrentBuildAsSeen = () => {
    localStorage.setItem(LAST_SEEN_BUILD_KEY, currentBuildId);
    setUpdateAvailable(false);
  };

  return {
    updateAvailable,
    markCurrentBuildAsSeen,
  };
}
