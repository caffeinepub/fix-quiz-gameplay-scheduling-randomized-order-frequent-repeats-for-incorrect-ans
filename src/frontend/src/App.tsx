import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useIsAdmin } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import LoginButton from './components/LoginButton';
import ProfileSetup from './components/ProfileSetup';
import QuizEditor from './quiz/QuizEditor';
import QuizGameplay from './quiz/QuizGameplay';
import QuizResults from './quiz/QuizResults';
import WrongAnswersReview from './quiz/WrongAnswersReview';
import DeploymentDiagnosticsPanel from './components/DeploymentDiagnosticsPanel';
import BuildIdentityFooter from './components/BuildIdentityFooter';
import AppHeaderBrand from './components/AppHeaderBrand';
import PendingUpdateBanner from './components/PendingUpdateBanner';
import { Edit, Play, Bug, AlertTriangle, RefreshCw, Power, ClipboardCheck } from 'lucide-react';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { diagnostics } from './utils/deploymentDiagnostics';
import { getBuildInfo } from './utils/buildStamp';
import { getActorConnectionInfo } from './utils/actorConnectionInfo';
import { refreshToLatestBuild } from './utils/refreshToLatestBuild';
import { detectStoppedCanister, formatStoppedCanisterMessage, getStoppedCanisterRecoverySteps } from './utils/stoppedCanisterDetection';
import type { WrongAnswerEntry } from './quiz/wrongAnswerTypes';

type View = 'editor' | 'gameplay' | 'results' | 'wrongAnswersReview';

const ACTIVE_QUIZ_ID = 'TN intelligence Quiz';

export default function App() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  const { data: isAdmin = false } = useIsAdmin();

  const [currentView, setCurrentView] = useState<View>('gameplay');
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerEntry[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [focusPublishSection, setFocusPublishSection] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isInActiveQuiz, setIsInActiveQuiz] = useState(false);

  // Check for debug flag in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true' || params.get('diagnostics') === 'true') {
      setShowDiagnostics(true);
    }
  }, []);

  // Monitor actor initialization state
  const actorQuery = queryClient.getQueryState(['actor', identity?.getPrincipal().toString()]);
  const actorError = actorQuery?.error as Error | undefined;
  const actorFailed = actorQuery?.status === 'error';

  // Detect stopped-canister error
  const stoppedCanisterInfo = actorError ? detectStoppedCanister(actorError) : { isStopped: false, canisterId: null, originalError: '' };

  // Capture actor initialization failures for diagnostics
  useEffect(() => {
    if (actorFailed && actorError) {
      const buildInfo = getBuildInfo();
      const stoppedInfo = detectStoppedCanister(actorError);
      
      diagnostics.captureError(
        actorError,
        `Actor initialization failed at ${new Date().toISOString()} | Build: ${buildInfo.version} (${buildInfo.deploymentId}) | Environment: ${buildInfo.environment}`,
        'actorInit',
        stoppedInfo.isStopped ? 'canisterStopped' : undefined,
        stoppedInfo.canisterId || undefined
      );
    }
  }, [actorFailed, actorError]);

  const handleQuizComplete = (correct: number, total: number, wrongAnswersList: WrongAnswerEntry[]) => {
    setSessionScore({ correct, total });
    setWrongAnswers(wrongAnswersList);
    setCurrentView('results');
  };

  const handleReviewWrongAnswers = () => {
    setCurrentView('wrongAnswersReview');
  };

  const handleBackToResults = () => {
    setCurrentView('results');
  };

  const handlePlayAgain = () => {
    setCurrentView('gameplay');
  };

  const handleStartQuiz = () => {
    setCurrentView('gameplay');
  };

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['actor'] });
      await queryClient.invalidateQueries({ queryKey: ['adminInit'] });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleHardRefresh = () => {
    refreshToLatestBuild();
  };

  const handleProfileSetupComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
  };

  const handleOpenPublishPanel = () => {
    setShowDiagnostics(true);
    setFocusPublishSection(true);
  };

  const handleCloseDiagnostics = () => {
    setShowDiagnostics(false);
    setFocusPublishSection(false);
  };

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Unauthenticated view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <AppHeaderBrand />
              <LoginButton />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full shadow-cyber">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-2">Welcome to Quiz Master</CardTitle>
              <CardDescription className="text-base">
                Please log in to access the quiz platform
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <LoginButton />
            </CardContent>
          </Card>
        </main>

        <BuildIdentityFooter />
        <Toaster />
      </div>
    );
  }

  // Actor initialization error view
  if (actorFailed) {
    const buildInfo = getBuildInfo();
    const connectionInfo = getActorConnectionInfo();

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <AppHeaderBrand />
              <LoginButton />
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {stoppedCanisterInfo.isStopped ? (
              <Alert variant="destructive" className="border-2">
                <Power className="h-5 w-5" />
                <AlertTitle className="text-lg font-semibold mb-2">Backend Canister Stopped</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p className="text-base">{formatStoppedCanisterMessage(stoppedCanisterInfo)}</p>
                  <div className="bg-destructive/10 p-4 rounded-lg space-y-2 text-sm">
                    <p className="font-semibold">Recovery Steps:</p>
                    <div className="space-y-1 pl-4">
                      {getStoppedCanisterRecoverySteps(connectionInfo.network === 'local').map((step, idx) => (
                        <p key={idx}>• {step}</p>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleRetryConnection}
                      disabled={isRetrying}
                      variant="default"
                      size="sm"
                    >
                      {isRetrying ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry Connection
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                      variant="outline"
                      size="sm"
                    >
                      <Bug className="h-4 w-4 mr-2" />
                      {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive" className="border-2">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="text-lg font-semibold mb-2">Connection Error</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p className="text-base">Unable to connect to the backend service.</p>
                  <div className="bg-destructive/10 p-3 rounded-lg">
                    <p className="text-sm font-mono break-all">
                      {actorError?.message || 'Unknown error'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleRetryConnection}
                      disabled={isRetrying}
                      variant="default"
                      size="sm"
                    >
                      {isRetrying ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry Connection
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleHardRefresh}
                      variant="outline"
                      size="sm"
                    >
                      <Power className="h-4 w-4 mr-2" />
                      Hard Refresh
                    </Button>
                    <Button
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                      variant="outline"
                      size="sm"
                    >
                      <Bug className="h-4 w-4 mr-2" />
                      {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {showDiagnostics && (
              <DeploymentDiagnosticsPanel
                onClose={handleCloseDiagnostics}
                focusPublishSection={focusPublishSection}
              />
            )}
          </div>
        </main>

        <BuildIdentityFooter />
        <Toaster />
      </div>
    );
  }

  // Profile setup modal
  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-background">
        <ProfileSetup onComplete={handleProfileSetupComplete} />
        <Toaster />
      </div>
    );
  }

  // Main authenticated view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isInActiveQuiz && (
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <AppHeaderBrand />
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant={currentView === 'editor' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentView('editor')}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editor
                    </Button>
                    <Button
                      variant={currentView === 'gameplay' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentView('gameplay')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Play
                    </Button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPublishPanel}
                  className="hidden sm:flex"
                  title="View deployment diagnostics and publishing checklist (publishing happens via Caffeine editor)"
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Deployment Checklist
                </Button>
                <LoginButton />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Always-available diagnostics button when header is hidden during active quiz */}
      {isInActiveQuiz && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPublishPanel}
            className="shadow-lg bg-card/95 backdrop-blur-sm"
            title="View deployment diagnostics and publishing checklist"
          >
            <ClipboardCheck className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Checklist</span>
          </Button>
        </div>
      )}

      <main className="flex-1">
        {!isInActiveQuiz && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <PendingUpdateBanner />
          </div>
        )}
        
        {currentView === 'editor' && isAdmin && (
          <QuizEditor quizId={ACTIVE_QUIZ_ID} onStartQuiz={handleStartQuiz} />
        )}
        {currentView === 'gameplay' && (
          <QuizGameplay
            quizId={ACTIVE_QUIZ_ID}
            onComplete={handleQuizComplete}
            onStepChange={setIsInActiveQuiz}
            onEditQuestions={isAdmin ? () => setCurrentView('editor') : undefined}
          />
        )}
        {currentView === 'results' && (
          <QuizResults
            score={sessionScore}
            wrongAnswers={wrongAnswers}
            onPlayAgain={handlePlayAgain}
            onReviewWrongAnswers={handleReviewWrongAnswers}
            onBackToEditor={isAdmin ? () => setCurrentView('editor') : undefined}
          />
        )}
        {currentView === 'wrongAnswersReview' && (
          <WrongAnswersReview
            wrongAnswers={wrongAnswers}
            onBack={handleBackToResults}
          />
        )}
      </main>

      {showDiagnostics && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen p-4">
            <DeploymentDiagnosticsPanel
              onClose={handleCloseDiagnostics}
              focusPublishSection={focusPublishSection}
            />
          </div>
        </div>
      )}

      <BuildIdentityFooter />
      <Toaster />
    </div>
  );
}
