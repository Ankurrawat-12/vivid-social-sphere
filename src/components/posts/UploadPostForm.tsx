
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Image } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UploadPostFormProps {
  onComplete: () => void;
}

const UploadPostForm: React.FC<UploadPostFormProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !user) {
      toast.error("Please select a file and ensure you're logged in");
      return;
    }
    
    setIsUploading(true);
    try {
      // 1. Upload image to Supabase storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
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
      
      // 3. Create post record in database
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          caption,
          image_url: imageUrl,
        })
        .select()
        .single();
        
      if (postError) {
        console.error("Error creating post:", postError);
        throw new Error(postError.message);
      }
      
      // 4. Notify followers about the new post
      try {
        // Get all followers
        const { data: followers, error: followersError } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id);
        
        if (followersError) {
          console.error("Error getting followers:", followersError);
        } else if (followers && followers.length > 0) {
          // Create notifications for each follower
          const notifications = followers.map((follower) => ({
            type: "post",
            source_user_id: user.id,
            target_user_id: follower.follower_id,
            post_id: post.id,
            content: caption.substring(0, 50) + (caption.length > 50 ? "..." : "")
          }));
          
          // Insert notifications
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert(notifications);
            
          if (notificationError) {
            console.error("Error creating notifications:", notificationError);
          }
        }
      } catch (notifyError) {
        console.error("Error in notification process:", notifyError);
        // Don't throw here - post is created, notifications are secondary
      }
      
      // 5. Invalidate posts query to refresh feed
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      
      // 6. Show success message
      toast.success("Post created successfully");
      
      // 7. Close modal
      onComplete();
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
