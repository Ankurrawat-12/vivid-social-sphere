
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload } from "lucide-react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface EditProfileFormProps {
  onComplete: () => void;
}

interface ProfileFormData {
  username: string;
  display_name: string;
  bio: string;
}

interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to match the crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Get the data from canvas as blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) throw new Error("Canvas is empty");
      resolve(blob);
    }, "image/jpeg");
  });
};

const EditProfileForm = ({ onComplete }: EditProfileFormProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    defaultValues: {
      username: profile?.username || "",
      display_name: profile?.display_name || "",
      bio: profile?.bio || ""
    }
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, GIF, or WEBP)");
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large. Maximum size is 5MB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setOriginalImageSrc(result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const applyCrop = async () => {
    if (!originalImageSrc || !croppedAreaPixels) return;
    
    try {
      const croppedImage = await getCroppedImg(originalImageSrc, croppedAreaPixels);
      const objectUrl = URL.createObjectURL(croppedImage);
      setAvatarPreview(objectUrl);
      
      // Convert Blob to File
      const fileName = `cropped-avatar-${Date.now()}.jpg`;
      const croppedFile = new File([croppedImage], fileName, { type: 'image/jpeg' });
      setAvatarFile(croppedFile);
      
      setShowCropModal(false);
    } catch (error) {
      console.error("Error cropping image:", error);
      toast.error("Failed to crop image. Please try again.");
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Update profile data
      const updates = {
        username: data.username,
        display_name: data.display_name,
        bio: data.bio,
        updated_at: new Date().toISOString(),
      };

      let avatar_url = profile?.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        try {
          // Create avatars bucket if it doesn't exist
          await createBucketIfNotExists('avatars');
          
          const fileExt = avatarFile.name.split(".").pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, avatarFile);
            
          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
            
          avatar_url = publicUrlData.publicUrl;
        } catch (error: any) {
          console.error("Error uploading avatar:", error);
          toast.error("Failed to upload profile picture. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, avatar_url })
        .eq("id", user.id);

      if (error) throw error;
      
      // Refresh profile data
      await refreshProfile();
      
      // Invalidate queries that might use profile data
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      
      toast.success("Profile updated successfully");
      onComplete();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarPreview || ""} alt={profile?.username || ""} />
              <AvatarFallback>
                {profile?.username?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="absolute bottom-0 right-0 rounded-full h-8 w-8"
              onClick={() => document.getElementById("avatar-upload")?.click()}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <Input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          {avatarFile && (
            <p className="text-xs text-muted-foreground mt-1">
              New image selected ({Math.round(avatarFile.size / 1024)} KB)
            </p>
          )}
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            {...register("username", { required: "Username is required" })}
          />
          {errors.username && (
            <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
          )}
        </div>
        
        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            {...register("display_name")}
          />
        </div>
        
        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            {...register("bio")}
            rows={4}
            placeholder="Tell us about yourself..."
          />
        </div>
        
        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Updating...
            </> 
          ) : "Save Changes"}
        </Button>
      </form>
      
      {/* Image Cropping Modal */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="space-y-6">
            <div className="h-[300px] relative">
              {originalImageSrc && (
                <Cropper
                  image={originalImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Zoom</Label>
              <Slider 
                value={[zoom]} 
                min={1} 
                max={3} 
                step={0.1} 
                onValueChange={(value) => setZoom(value[0])}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCropModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={applyCrop}>
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditProfileForm;
