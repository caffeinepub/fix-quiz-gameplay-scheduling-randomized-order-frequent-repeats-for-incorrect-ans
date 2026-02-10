import { getBuildInfo } from '../utils/buildStamp';

export default function BuildIdentityFooter() {
  const buildInfo = getBuildInfo();

  return (
    <footer className="w-full py-3 px-4 border-t bg-muted/30 text-xs text-muted-foreground">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="font-medium">v{buildInfo.version}</span>
        <span className="hidden sm:inline">•</span>
        <span className="truncate max-w-[200px] sm:max-w-none" title={buildInfo.timestamp}>
          {new Date(buildInfo.timestamp).toLocaleString('en-US')}
        </span>
        <span className="hidden sm:inline">•</span>
        <span className="truncate max-w-[150px] sm:max-w-none font-mono text-[10px]" title={buildInfo.deploymentId}>
          {buildInfo.deploymentId}
        </span>
      </div>
    </footer>
  );
}
