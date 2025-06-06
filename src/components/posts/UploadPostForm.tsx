import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Image, Music, Video, Play, Pause } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase, createBucketIfNotExists } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface UploadPostFormProps {
  onSuccess: () => void;
}

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  file_url: string;
  duration: number;
}

const UploadPostForm: React.FC<UploadPostFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { isCreator } = useUserRole();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [musicStartTime, setMusicStartTime] = useState(0);
  const [musicEndTime, setMusicEndTime] = useState(30);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch music library
  const { data: musicLibrary = [] } = useQuery({
    queryKey: ["musicLibrary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_library")
        .select("*")
        .order("title");
      
      if (error) throw error;
      return data as MusicTrack[];
    }
  });

  useEffect(() => {
    createBucketIfNotExists('posts');
    createBucketIfNotExists('videos');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Determine media type
      if (selectedFile.type.startsWith('video/')) {
        // Check video duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          const duration = video.duration;
          if (duration > 60 && !isCreator) {
            toast.error("Video must be 60 seconds or less. Request creator mode for longer videos.");
            return;
          }
          setMediaType("video");
          setFile(selectedFile);
          const objectUrl = URL.createObjectURL(selectedFile);
          setPreview(objectUrl);
        };
        
        video.src = URL.createObjectURL(selectedFile);
      } else if (selectedFile.type.startsWith('image/')) {
        setMediaType("image");
        setFile(selectedFile);
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);
      } else {
        toast.error("Please select a valid image or video file");
      }
    }
  };

  const handleMusicSelect = (musicId: string) => {
    setSelectedMusic(musicId);
    const track = musicLibrary.find(m => m.id === musicId);
    if (track) {
      setMusicEndTime(Math.min(30, track.duration));
      if (audioElement) {
        audioElement.pause();
        setIsPlaying(false);
      }
      const audio = new Audio(track.file_url);
      setAudioElement(audio);
    }
  };

  const toggleMusicPreview = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.currentTime = musicStartTime;
      audioElement.play();
      setIsPlaying(true);
      
      // Stop at end time
      const checkTime = () => {
        if (audioElement.currentTime >= musicEndTime) {
          audioElement.pause();
          setIsPlaying(false);
        } else if (isPlaying) {
          requestAnimationFrame(checkTime);
        }
      };
      checkTime();
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
      let fileUrl = "";
      
      if (mediaType === "video") {
        // Upload video to videos bucket
        await createBucketIfNotExists('videos');
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(filePath, file);
          
        if (uploadError) {
          console.error("Error uploading video:", uploadError);
          throw new Error(uploadError.message);
        }
        
        const { data: publicUrlData } = supabase.storage
          .from("videos")
          .getPublicUrl(filePath);
          
        if (!publicUrlData?.publicUrl) {
          throw new Error("Failed to get public URL for uploaded video");
        }
        
        fileUrl = publicUrlData.publicUrl;
      } else {
        // Upload image to posts bucket
        await createBucketIfNotExists('posts');
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("posts")
          .upload(filePath, file);
          
        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          throw new Error(uploadError.message);
        }
        
        const { data: publicUrlData } = supabase.storage
          .from("posts")
          .getPublicUrl(filePath);
          
        if (!publicUrlData?.publicUrl) {
          throw new Error("Failed to get public URL for uploaded image");
        }
        
        fileUrl = publicUrlData.publicUrl;
      }
      
      // Create post record with explicit user_id
      const postData: any = {
        user_id: user.id,
        caption: caption || "",
        media_type: mediaType,
        image_url: mediaType === "image" ? fileUrl : null,
        video_url: mediaType === "video" ? fileUrl : null,
      };
      
      // Add music data if selected
      if (selectedMusic) {
        const track = musicLibrary.find(m => m.id === selectedMusic);
        if (track) {
          postData.music_url = track.file_url;
          postData.music_start_time = musicStartTime;
          postData.music_end_time = musicEndTime;
        }
      }
      
      console.log("Creating post with data:", postData);
      
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();
        
      if (postError) {
        console.error("Error creating post:", postError);
        throw new Error(postError.message);
      }
      
      console.log("Post created successfully:", post);
      
      // Clean up
      if (audioElement) {
        audioElement.pause();
        setIsPlaying(false);
      }
      
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post created successfully");
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
      {/* Media Upload */}
      <div className="space-y-2">
        <Label htmlFor="media-upload">Upload Image or Video</Label>
        <div className="border-2 border-dashed border-border rounded-md p-4 text-center">
          {preview ? (
            <div className="relative">
              {mediaType === "video" ? (
                <video 
                  src={preview} 
                  className="max-h-60 max-w-full mx-auto rounded-md"
                  controls
                />
              ) : (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-h-60 max-w-full mx-auto rounded-md"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setMediaType("image");
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="flex gap-2 mb-2">
                <Image className="h-8 w-8 text-muted-foreground" />
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
              <Label
                htmlFor="file-upload"
                className="cursor-pointer text-sm text-social-purple hover:text-social-purple/80"
              >
                Click to upload image or video
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Images: PNG, JPG, GIF | Videos: MP4, WebM (max 60s)
              </p>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileChange}
                required
              />
            </div>
          )}
        </div>
      </div>

      {/* Music Selection */}
      <div className="space-y-2">
        <Label>Add Music (Optional)</Label>
        <Select onValueChange={handleMusicSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a track from our library" />
          </SelectTrigger>
          <SelectContent>
            {musicLibrary.map((track) => (
              <SelectItem key={track.id} value={track.id}>
                {track.title} - {track.artist}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedMusic && (
          <div className="space-y-2 p-3 border rounded-md bg-muted/50">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={toggleMusicPreview}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                Preview
              </Button>
              <span className="text-sm text-muted-foreground">
                {musicStartTime}s - {musicEndTime}s
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="start-time" className="text-xs">Start (seconds)</Label>
                <Input
                  id="start-time"
                  type="number"
                  min="0"
                  max={musicLibrary.find(m => m.id === selectedMusic)?.duration || 0}
                  value={musicStartTime}
                  onChange={(e) => setMusicStartTime(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="text-xs">End (seconds)</Label>
                <Input
                  id="end-time"
                  type="number"
                  min={musicStartTime + 1}
                  max={musicLibrary.find(m => m.id === selectedMusic)?.duration || 0}
                  value={musicEndTime}
                  onChange={(e) => setMusicEndTime(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}
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
