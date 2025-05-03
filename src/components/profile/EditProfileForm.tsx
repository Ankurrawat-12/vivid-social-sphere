
import { useState } from "react";
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

interface EditProfileFormProps {
  onComplete: () => void;
}

interface ProfileFormData {
  username: string;
  display_name: string;
  bio: string;
}

const EditProfileForm = ({ onComplete }: EditProfileFormProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (file) {
      setAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
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
  );
};

export default EditProfileForm;
