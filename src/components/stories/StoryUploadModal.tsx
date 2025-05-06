
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, createBucketIfNotExists } from '@/integrations/supabase/client';
import { Loader2, Upload, Image, Film } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface StoryUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StoryUploadModal: React.FC<StoryUploadModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    const fileType = selectedFile.type;
    if (!fileType.startsWith('image/') && !fileType.startsWith('video/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image or video file',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);

    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Ensure stories bucket exists
      await createBucketIfNotExists('stories');

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath);

      // Insert story record
      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: urlData.publicUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;

      // Success
      toast({
        title: 'Story uploaded!',
        description: 'Your story has been uploaded successfully.',
      });

      // Reset state and close modal
      setFile(null);
      setPreviewUrl(null);
      onOpenChange(false);

      // Invalidate stories query
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    } catch (error) {
      console.error('Error uploading story:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your story. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const isImage = file?.type.startsWith('image/');
  const isVideo = file?.type.startsWith('video/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-md p-12">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="mb-4 mt-2">
                  <p className="text-sm font-medium">Drag and drop your file here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports images and videos up to 10MB
                  </p>
                </div>
                <Label
                  htmlFor="file-upload"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none cursor-pointer"
                >
                  Choose file
                </Label>
              </div>
              <input
                id="file-upload"
                type="file"
                accept="image/*,video/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
              {isImage && (
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="h-full w-full object-cover"
                />
              )}
              {isVideo && (
                <video
                  src={previewUrl}
                  controls
                  className="h-full w-full object-cover"
                />
              )}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                }}
              >
                Change
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : (
                'Share'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryUploadModal;
