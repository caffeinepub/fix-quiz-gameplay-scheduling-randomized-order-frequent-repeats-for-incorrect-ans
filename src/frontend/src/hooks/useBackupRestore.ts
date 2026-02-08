import { useState } from 'react';
import { useActor } from './useActor';
import { useQueryClient } from '@tanstack/react-query';
import { serializeStateSnapshot, deserializeStateSnapshot, validateSerializedSnapshot, type SerializedStateSnapshot } from '../utils/stateSnapshotJson';
import type { StateSnapshot } from '../backend';

export function useBackupRestore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Export full state as downloadable JSON
   */
  const exportBackup = async (): Promise<{ success: boolean; message: string; data?: SerializedStateSnapshot }> => {
    if (!actor) {
      return { success: false, message: 'Actor not available. Please refresh and try again.' };
    }

    setIsExporting(true);
    setError(null);

    try {
      const snapshot: StateSnapshot = await actor.exportAllState();
      const serialized = serializeStateSnapshot(snapshot);
      
      return {
        success: true,
        message: 'Backup exported successfully',
        data: serialized
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export backup';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Import and restore state from JSON file
   */
  const restoreBackup = async (fileContent: string): Promise<{ success: boolean; message: string }> => {
    if (!actor) {
      return { success: false, message: 'Actor not available. Please refresh and try again.' };
    }

    setIsRestoring(true);
    setError(null);

    try {
      // Parse JSON
      let parsed: any;
      try {
        parsed = JSON.parse(fileContent);
      } catch (parseError) {
        return { success: false, message: 'Invalid JSON file. Please select a valid backup file.' };
      }

      // Validate structure
      const validation = validateSerializedSnapshot(parsed);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'Invalid backup file format' };
      }

      // Deserialize to StateSnapshot
      const snapshot = deserializeStateSnapshot(parsed as SerializedStateSnapshot);

      // Call backend restore
      await actor.restoreState(snapshot);

      // Invalidate all queries to refresh UI
      queryClient.invalidateQueries();

      return {
        success: true,
        message: 'Backup restored successfully! All data has been updated.'
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to restore backup';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsRestoring(false);
    }
  };

  return {
    exportBackup,
    restoreBackup,
    isExporting,
    isRestoring,
    error
  };
}
