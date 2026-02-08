import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ExternalBlob } from '../backend';
import { isValidJpegFile, createExternalBlobFromFile } from './imageUtils';
import { Progress } from '../components/ui/progress';

interface QuestionImagePickerProps {
  imageUrl?: ExternalBlob;
  onImageChange: (blob: ExternalBlob | undefined) => void;
  questionIndex: number;
}

export default function QuestionImagePicker({
  imageUrl,
  onImageChange,
  questionIndex,
}: QuestionImagePickerProps) {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidJpegFile(file)) {
      toast.error('Please select a valid JPG/JPEG file');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      event.target.value = '';
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const blob = await createExternalBlobFromFile(file, (progress) => {
        setUploadProgress(progress);
      });

      onImageChange(blob);
      toast.success('Image attached successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to attach image');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    onImageChange(undefined);
    toast.info('Image removed');
  };

  return (
    <div className="space-y-3">
      <Label>Question Image (JPG only)</Label>
      
      {imageUrl ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            <img
              src={imageUrl.getDirectURL()}
              alt={`Question ${questionIndex + 1}`}
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveImage}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Remove Image
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor={`image-upload-${questionIndex}`}
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <>
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground animate-pulse" />
                    <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">JPG only (max 5MB)</p>
                  </>
                )}
              </div>
              <Input
                id={`image-upload-${questionIndex}`}
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
          {isUploading && uploadProgress > 0 && (
            <Progress value={uploadProgress} className="w-full" />
          )}
        </div>
      )}
    </div>
  );
}
