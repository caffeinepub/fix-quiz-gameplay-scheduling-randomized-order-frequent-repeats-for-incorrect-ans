import { useState, useRef } from 'react';
import { useBackupRestore } from '../hooks/useBackupRestore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Download, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

export default function BackupRestorePanel() {
  const { exportBackup, restoreBackup, isExporting, isRestoring } = useBackupRestore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const result = await exportBackup();
    
    if (result.success && result.data) {
      // Download the file
      const jsonString = JSON.stringify(result.data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `quiz-backup-${timestamp}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Backup downloaded successfully');
    } else {
      toast.error(result.message);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON file');
      return;
    }

    setSelectedFile(file);

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setSelectedFile(null);
    };
    reader.readAsText(file);
  };

  const handleRestoreClick = () => {
    if (!fileContent) {
      toast.error('Please select a backup file first');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmRestore = async () => {
    setShowConfirmDialog(false);
    
    if (!fileContent) return;

    const result = await restoreBackup(fileContent);
    
    if (result.success) {
      toast.success(result.message);
      setSelectedFile(null);
      setFileContent(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleCancelRestore = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>
            Export your quiz data as a backup file or restore from a previous backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Section */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-1">Export Backup</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Download all your quizzes, questions, and block names as a JSON file
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full sm:w-auto"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Backup
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-6">
            {/* Import Section */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-1">Restore Backup</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a backup file to restore your quiz data
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Restoring a backup will replace all current data. Make sure to export a backup first if you want to keep your current data.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="backup-file">Select Backup File</Label>
                  <Input
                    ref={fileInputRef}
                    id="backup-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    disabled={isRestoring}
                    className="mt-1"
                  />
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Selected: {selectedFile.name}</span>
                  </div>
                )}

                <Button
                  onClick={handleRestoreClick}
                  disabled={!selectedFile || isRestoring}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Restore Backup
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Restore</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all your current quiz data with the data from the backup file.
              This action cannot be undone. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRestore}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore}>
              Yes, Restore Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
