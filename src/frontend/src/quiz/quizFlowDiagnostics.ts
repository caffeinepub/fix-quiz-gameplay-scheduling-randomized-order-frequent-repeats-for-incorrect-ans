// Quiz flow diagnostics helper for development/testing
// Logs step transitions and triggers when enabled via localStorage flag

const DIAGNOSTICS_KEY = 'quiz-flow-diagnostics';

function isDiagnosticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DIAGNOSTICS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function enableDiagnostics() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DIAGNOSTICS_KEY, 'true');
    console.log('[Quiz Diagnostics] Enabled. Reload to see step transitions.');
  }
}

export function disableDiagnostics() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DIAGNOSTICS_KEY);
    console.log('[Quiz Diagnostics] Disabled.');
  }
}

export function logStepTransition(
  from: string,
  to: string,
  trigger: string,
  metadata?: Record<string, any>
) {
  if (!isDiagnosticsEnabled()) return;
  
  console.log(
    `[Quiz Flow] ${from} → ${to}`,
    `| Trigger: ${trigger}`,
    metadata ? `| ${JSON.stringify(metadata)}` : ''
  );
}

export function logAction(action: string, metadata?: Record<string, any>) {
  if (!isDiagnosticsEnabled()) return;
  
  console.log(
    `[Quiz Action] ${action}`,
    metadata ? `| ${JSON.stringify(metadata)}` : ''
  );
}

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).quizDiagnostics = {
    enable: enableDiagnostics,
    disable: disableDiagnostics,
    isEnabled: isDiagnosticsEnabled,
  };
}
