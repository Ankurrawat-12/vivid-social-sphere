import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Image, Music } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, createBucketIfNotExists } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UploadPostFormProps {
  onSuccess: () => void;
}

const UploadPostForm: React.FC<UploadPostFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Ensure the posts bucket exists when component mounts
  useEffect(() => {
    createBucketIfNotExists('posts');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);

      // Create preview
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);

      // Clean up preview on unmount
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('audio/')) {
        toast.error("Please select a valid audio file");
        return;
      }
      setMusicFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !user) {
      toast.error("Please select a file and ensure you're logged in");
      return;
    }
    
    setIsUploading(true);
    try {
      // Ensure the posts bucket exists
      await createBucketIfNotExists('posts');
      
      // 1. Upload image to Supabase storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(filePath, file);
        
      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw new Error(uploadError.message);
      }
      
      // 2. Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("posts")
        .getPublicUrl(filePath);
        
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Failed to get public URL for uploaded file");
      }

      const imageUrl = publicUrlData.publicUrl;
      
      // 3. Upload music file if provided
      let musicUrl = null;
      if (musicFile) {
        const musicExt = musicFile.name.split(".").pop();
        const musicFileName = `music_${crypto.randomUUID()}.${musicExt}`;
        const musicFilePath = `${user.id}/${musicFileName}`;
        
        const { error: musicUploadError } = await supabase.storage
          .from("posts")
          .upload(musicFilePath, musicFile);
          
        if (musicUploadError) {
          console.error("Error uploading music file:", musicUploadError);
          // Don't throw here - continue without music
        } else {
          const { data: musicPublicUrlData } = supabase.storage
            .from("posts")
            .getPublicUrl(musicFilePath);
          musicUrl = musicPublicUrlData?.publicUrl;
        }
      }
      
      // 4. Create post record in database
      const postData: any = {
        user_id: user.id,
        caption,
        image_url: imageUrl,
      };
      
      if (musicUrl) {
        postData.music_url = musicUrl;
      }
      
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();
        
      if (postError) {
        console.error("Error creating post:", postError);
        throw new Error(postError.message);
      }
      
      // 5. Notify followers about the new post
      try {
        const { data: followers, error: followersError } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id)
          .eq("status", "accepted");
        
        if (followersError) {
          console.error("Error getting followers:", followersError);
        } else if (followers && followers.length > 0) {
          const notifications = followers.map((follower) => ({
            type: "post",
            source_user_id: user.id,
            target_user_id: follower.follower_id,
            post_id: post.id,
            content: caption.substring(0, 50) + (caption.length > 50 ? "..." : "")
          }));
          
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert(notifications);
            
          if (notificationError) {
            console.error("Error creating notifications:", notificationError);
          }
        }
      } catch (notifyError) {
        console.error("Error in notification process:", notifyError);
      }
      
      // 6. Invalidate posts query to refresh feed
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      
      // 7. Show success message
      toast.success("Post created successfully");
      
      // 8. Close modal
      onSuccess();
    } catch (error) {
      console.error("Error uploading post:", error);
      toast.error(`Failed to create post: ${error instanceof Error ? error.message : "Please try again"}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="post-image">Image</Label>
        <div className="border-2 border-dashed border-border rounded-md p-4 text-center">
          {preview ? (
            <div className="relative">
              <img 
                src={preview} 
                alt="Preview" 
                className="max-h-60 max-w-full mx-auto rounded-md"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <Image className="h-10 w-10 text-muted-foreground mb-2" />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer text-sm text-social-purple hover:text-social-purple/80"
              >
                Click to upload an image
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, GIF up to 10MB
              </p>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </div>
          )}
        </div>
      </div>

      {/* Music Upload */}
      <div className="space-y-2">
        <Label htmlFor="music-upload">Music (Optional)</Label>
        <div className="border-2 border-dashed border-border rounded-md p-4 text-center">
          {musicFile ? (
            <div className="flex items-center justify-center gap-2">
              <Music className="h-5 w-5 text-social-purple" />
              <span className="text-sm">{musicFile.name}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMusicFile(null)}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <Music className="h-8 w-8 text-muted-foreground mb-2" />
              <Label
                htmlFor="music-upload"
                className="cursor-pointer text-sm text-social-purple hover:text-social-purple/80"
              >
                Click to add music
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                MP3, WAV, M4A up to 10MB
              </p>
              <Input
                id="music-upload"
                type="file"
                className="hidden"
                accept="audio/*"
                onChange={handleMusicChange}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Caption */}
      <div className="space-y-2">
        <Label htmlFor="caption">Caption</Label>
        <Textarea
          id="caption"
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
        />
      </div>
      
      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!file || isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Post
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default UploadPostForm;
