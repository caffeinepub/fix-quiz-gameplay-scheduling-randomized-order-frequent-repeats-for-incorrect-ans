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
import { BookOpen, Edit, Play, Bug, AlertTriangle, RefreshCw, Power, Rocket } from 'lucide-react';
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

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  const handleProfileComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
  };

  const handleStartQuiz = () => {
    setSessionScore({ correct: 0, total: 0 });
    setWrongAnswers([]);
    setCurrentView('gameplay');
    setIsInActiveQuiz(false);
  };

  const handleQuizComplete = (correct: number, total: number, wrongAnswersList: WrongAnswerEntry[]) => {
    setSessionScore({ correct, total });
    setWrongAnswers(wrongAnswersList);
    setCurrentView('results');
    setIsInActiveQuiz(false);
  };

  const handleBackToEditor = () => {
    setCurrentView('editor');
    setIsInActiveQuiz(false);
  };

  const handlePlayAgain = () => {
    setSessionScore({ correct: 0, total: 0 });
    setWrongAnswers([]);
    setCurrentView('gameplay');
    setIsInActiveQuiz(false);
  };

  const handleReviewWrongAnswers = () => {
    setCurrentView('wrongAnswersReview');
    setIsInActiveQuiz(false);
  };

  const handleBackToResults = () => {
    setCurrentView('results');
    setIsInActiveQuiz(false);
  };

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    diagnostics.captureRetryAttempt('User-initiated retry from actor failure screen');
    
    // Invalidate actor query to trigger re-initialization
    await queryClient.invalidateQueries({ queryKey: ['actor'] });
    
    // Wait a moment for the query to settle
    setTimeout(() => {
      setIsRetrying(false);
    }, 2000);
  };

  const handleForceRefresh = () => {
    diagnostics.captureForceRefresh('User-initiated force refresh from actor failure screen');
    refreshToLatestBuild();
  };

  const handleOpenPublishHelp = () => {
    setFocusPublishSection(true);
    setShowDiagnostics(true);
  };

  const handleCloseDiagnostics = () => {
    setShowDiagnostics(false);
    setFocusPublishSection(false);
  };

  const handleQuizStepChange = (isActiveQuiz: boolean) => {
    setIsInActiveQuiz(isActiveQuiz);
  };

  // Unauthenticated view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="w-full border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                TN intelligence Quiz
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenPublishHelp}
                className="text-muted-foreground"
                title="Publish help"
              >
                <Rocket className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiagnostics(true)}
                className="text-muted-foreground"
                title="Diagnostics"
              >
                <Bug className="h-4 w-4" />
              </Button>
              <LoginButton />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Welcome to TN intelligence Quiz</CardTitle>
              <CardDescription className="text-center">
                Please log in to access the quiz platform
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <LoginButton />
            </CardContent>
          </Card>
        </main>

        <BuildIdentityFooter />

        {showDiagnostics && (
          <DeploymentDiagnosticsPanel 
            onClose={handleCloseDiagnostics}
            focusPublishSection={focusPublishSection}
          />
        )}
        <Toaster />
      </div>
    );
  }

  // Actor initialization failed - show error screen with enhanced diagnostics
  if (actorFailed) {
    const connectionInfo = getActorConnectionInfo();
    const isLocalNetwork = connectionInfo.network === 'local' || connectionInfo.host.includes('localhost') || connectionInfo.host.includes('127.0.0.1');
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="w-full border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                TN intelligence Quiz
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenPublishHelp}
                className="text-muted-foreground"
                title="Publish help"
              >
                <Rocket className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiagnostics(true)}
                className="text-muted-foreground"
                title="Diagnostics"
              >
                <Bug className="h-4 w-4" />
              </Button>
              <LoginButton />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                {stoppedCanisterInfo.isStopped ? (
                  <>
                    <Power className="h-6 w-6" />
                    Backend Canister Stopped
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6" />
                    Connection Error
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {stoppedCanisterInfo.isStopped 
                  ? formatStoppedCanisterMessage(stoppedCanisterInfo)
                  : 'Unable to connect to the backend canister'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stoppedCanisterInfo.isStopped ? (
                <>
                  <Alert variant="destructive">
                    <Power className="h-4 w-4" />
                    <AlertTitle>Canister is Not Running</AlertTitle>
                    <AlertDescription className="mt-2 space-y-3">
                      <div className="text-sm">
                        The backend canister must be started before the application can function.
                        {stoppedCanisterInfo.canisterId && (
                          <div className="mt-2 font-mono text-xs bg-destructive/10 p-2 rounded">
                            Canister ID: {stoppedCanisterInfo.canisterId}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm">
                        <div className="font-semibold mb-2">To start the canister:</div>
                        <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                          {getStoppedCanisterRecoverySteps(isLocalNetwork).map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      <div className="text-xs pt-2 border-t border-destructive/20">
                        <div><strong>Network:</strong> {connectionInfo.network}</div>
                        <div><strong>Host:</strong> {connectionInfo.host}</div>
                        <div><strong>Canister ID:</strong> {connectionInfo.canisterId || '(not found)'}</div>
                        <div><strong>Source:</strong> {connectionInfo.canisterIdSource}</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <Alert variant="destructive">
                  <AlertTitle>Error Details</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <div className="font-mono text-sm break-all">
                      {actorError?.message || 'Unknown error occurred'}
                    </div>
                    <div className="text-xs space-y-1 mt-3 pt-3 border-t border-destructive/20">
                      <div><strong>Network:</strong> {connectionInfo.network}</div>
                      <div><strong>Host:</strong> {connectionInfo.host}</div>
                      <div><strong>Canister ID:</strong> {connectionInfo.canisterId || '(not found)'}</div>
                      <div><strong>Source:</strong> {connectionInfo.canisterIdSource}</div>
                      <div><strong>Sources Attempted:</strong> {connectionInfo.canisterIdSourcesAttempted.join(', ')}</div>
                      {connectionInfo.canisterIdResolutionError && (
                        <div className="text-destructive font-semibold mt-2">
                          <strong>Resolution Error:</strong> {connectionInfo.canisterIdResolutionError}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleRetryConnection}
                  disabled={isRetrying}
                  variant="outline"
                  className="flex-1"
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
                  onClick={handleForceRefresh}
                  variant="default"
                  className="flex-1"
                >
                  <Power className="h-4 w-4 mr-2" />
                  Force Refresh
                </Button>
              </div>

              <Button
                onClick={() => setShowDiagnostics(true)}
                variant="outline"
                className="w-full"
              >
                <Bug className="h-4 w-4 mr-2" />
                View Full Diagnostics
              </Button>
            </CardContent>
          </Card>
        </main>

        <BuildIdentityFooter />

        {showDiagnostics && (
          <DeploymentDiagnosticsPanel 
            onClose={handleCloseDiagnostics}
            focusPublishSection={focusPublishSection}
          />
        )}
        <Toaster />
      </div>
    );
  }

  // Authenticated view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              TN intelligence Quiz
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isInActiveQuiz && (
              <>
                <Button
                  variant={currentView === 'gameplay' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={handleStartQuiz}
                  className="hidden sm:flex"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </Button>
                <Button
                  variant={currentView === 'gameplay' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={handleStartQuiz}
                  className="sm:hidden"
                  title="Play"
                >
                  <Play className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant={currentView === 'editor' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={handleBackToEditor}
                      className="hidden sm:flex"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant={currentView === 'editor' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={handleBackToEditor}
                      className="sm:hidden"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenPublishHelp}
              className="text-muted-foreground"
              title="Publish help"
            >
              <Rocket className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiagnostics(true)}
              className="text-muted-foreground"
              title="Diagnostics"
            >
              <Bug className="h-4 w-4" />
            </Button>
            <LoginButton />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {currentView === 'editor' && isAdmin && (
          <QuizEditor quizId={ACTIVE_QUIZ_ID} onStartQuiz={handleStartQuiz} />
        )}
        {currentView === 'gameplay' && (
          <QuizGameplay 
            quizId={ACTIVE_QUIZ_ID} 
            onComplete={handleQuizComplete}
            onStepChange={handleQuizStepChange}
          />
        )}
        {currentView === 'results' && (
          <QuizResults
            score={sessionScore}
            wrongAnswers={wrongAnswers}
            onPlayAgain={handlePlayAgain}
            onReviewWrongAnswers={handleReviewWrongAnswers}
            onBackToEditor={isAdmin ? handleBackToEditor : undefined}
          />
        )}
        {currentView === 'wrongAnswersReview' && (
          <WrongAnswersReview
            wrongAnswers={wrongAnswers}
            onBack={handleBackToResults}
          />
        )}
      </main>

      <BuildIdentityFooter />

      {showProfileSetup && (
        <ProfileSetup onComplete={handleProfileComplete} />
      )}

      {showDiagnostics && (
        <DeploymentDiagnosticsPanel 
          onClose={handleCloseDiagnostics}
          focusPublishSection={focusPublishSection}
        />
      )}
      <Toaster />
    </div>
  );
}
