import { usePendingUpdate } from '../hooks/usePendingUpdate';
import { useSingleRefreshAttempt } from '../hooks/useSingleRefreshAttempt';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { RefreshCw, X } from 'lucide-react';

/**
 * Visible update notification banner that detects newer builds via usePendingUpdate hook.
 * Displays user-facing message with guarded refresh action that prevents multiple attempts
 * and shows progress state before navigation.
 */
export default function PendingUpdateBanner() {
  const { updateAvailable, markCurrentBuildAsSeen } = usePendingUpdate();
  const { isRefreshing, triggerRefresh } = useSingleRefreshAttempt();

  if (!updateAvailable) {
    return null;
  }

  const handleRefresh = () => {
    triggerRefresh();
  };

  const handleDismiss = () => {
    markCurrentBuildAsSeen();
  };

  return (
    <Alert className="border-primary bg-primary/5">
      <RefreshCw className="h-4 w-4" />
      <AlertTitle className="font-semibold">New Version Available</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm">
          A newer version of this app is available. Refresh to load the latest updates and improvements.
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleRefresh}
            size="sm"
            variant="default"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh Now
              </>
            )}
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            disabled={isRefreshing}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
