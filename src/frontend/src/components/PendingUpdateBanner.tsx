import { usePendingUpdate } from '../hooks/usePendingUpdate';
import { refreshToLatestBuild } from '../utils/refreshToLatestBuild';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { RefreshCw, X } from 'lucide-react';

export default function PendingUpdateBanner() {
  const { updateAvailable, markCurrentBuildAsSeen } = usePendingUpdate();

  if (!updateAvailable) {
    return null;
  }

  const handleRefresh = () => {
    refreshToLatestBuild();
  };

  const handleDismiss = () => {
    markCurrentBuildAsSeen();
  };

  return (
    <Alert className="border-primary bg-primary/10 mb-4">
      <RefreshCw className="h-4 w-4" />
      <AlertTitle>Update Available</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>A new version of the app is available. Refresh to get the latest features and improvements.</span>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={handleRefresh}
            size="sm"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
