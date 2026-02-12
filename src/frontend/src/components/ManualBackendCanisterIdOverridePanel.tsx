import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { 
  setPersistedOverride, 
  clearPersistedOverride, 
  getPersistedOverride,
  validateCanisterId 
} from '../utils/manualBackendCanisterOverride';

interface ManualBackendCanisterIdOverridePanelProps {
  onRetry: () => void;
}

export function ManualBackendCanisterIdOverridePanel({ onRetry }: ManualBackendCanisterIdOverridePanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const existingOverride = getPersistedOverride();

  const handleSaveAndRetry = () => {
    setFeedback(null);
    
    if (!inputValue.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a backend canister ID' });
      return;
    }

    const validated = validateCanisterId(inputValue);
    if (!validated) {
      setFeedback({ 
        type: 'error', 
        message: 'Invalid canister ID format. Please enter a valid IC canister ID (alphanumeric with hyphens).' 
      });
      return;
    }

    const saved = setPersistedOverride(validated);
    if (!saved) {
      setFeedback({ type: 'error', message: 'Failed to save override. Check browser console for details.' });
      return;
    }

    setFeedback({ type: 'success', message: `Saved override: ${validated}` });
    setInputValue('');
    
    // Trigger retry after a short delay to show success message
    setTimeout(() => {
      onRetry();
    }, 500);
  };

  const handleClearOverride = () => {
    clearPersistedOverride();
    setFeedback({ type: 'success', message: 'Cleared saved override' });
    setInputValue('');
    
    // Trigger retry after clearing
    setTimeout(() => {
      onRetry();
    }, 500);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Manual Backend Canister ID Override</CardTitle>
        <CardDescription>
          If you know your backend canister ID, you can enter it here to bypass the configuration error.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingOverride && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Current override:</strong> {existingOverride}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="canister-id-input">Backend Canister ID</Label>
          <div className="flex gap-2">
            <Input
              id="canister-id-input"
              type="text"
              placeholder="e.g., rrkah-fqaaa-aaaaa-aaaaq-cai"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveAndRetry();
                }
              }}
              className="font-mono text-sm"
            />
            <Button onClick={handleSaveAndRetry} variant="default">
              Save & Retry
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your backend canister ID and click "Save & Retry" to reconnect.
          </p>
        </div>

        {existingOverride && (
          <Button 
            onClick={handleClearOverride} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Saved Override
          </Button>
        )}

        {feedback && (
          <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
            {feedback.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> You can also pass the canister ID as a URL parameter:{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">?backendCanisterId=YOUR_CANISTER_ID</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
