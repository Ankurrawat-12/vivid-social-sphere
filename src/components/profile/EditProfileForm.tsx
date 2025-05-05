import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import EasyCrop from "react-easy-crop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, createBucketIfNotExists } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";

const formSchema = z.object({
  username: z.string()
    .min(2, {
      message: "Username must be at least 2 characters.",
    })
    .max(30, {
      message: "Username must not be longer than 30 characters.",
    }),
  displayName: z.string().max(50).optional(),
  bio: z.string().max(160).optional(),
});

interface EditProfileFormProps {
  onComplete?: () => void;
}

type FormValues = z.infer<typeof formSchema>;

const EditProfileForm = ({ onComplete }: EditProfileFormProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: profile?.username || "",
      displayName: profile?.display_name || "",
      bio: profile?.bio || "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username,
        displayName: profile.display_name || "",
        bio: profile.bio || "",
      });
    }
  }, [profile, form]);

  const onCropComplete = React.useCallback((croppedArea: any, croppedAreaPixelsLocal: any) => {
    setCroppedAreaPixels(croppedAreaPixelsLocal);
  }, []);

  const uploadProfilePicture = async () => {
    if (!croppedAreaPixels) return;

    setIsUploading(true);
    try {
      const canvas = document.createElement('canvas');
      const image = new Image();
      image.src = imageSrc as string;

      // Wait for the image to load
      await new Promise((resolve) => {
        image.onload = resolve;
      });

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      const dataUrl = canvas.toDataURL('image/jpeg');
      setCroppedImage(dataUrl);

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

      // Upload the image to Supabase storage
      await createBucketIfNotExists('avatars');
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(`${user?.id}/avatar.jpg`, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const publicURL = supabase.storage.from('avatars').getPublicUrl(data.path);

      // Update user profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicURL.data.publicUrl })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      toast.success("Profile picture updated successfully");
      refreshProfile?.();
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error("Failed to update profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          username: values.username,
          display_name: values.displayName,
          bio: values.bio,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      refreshProfile?.();
      onComplete?.();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        let imageDataUrl = await readFile(file);
        setImageSrc(imageDataUrl);
      } else {
        toast.error("Please select an image file");
      }
    }
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result as string), false);
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Edit Profile</h2>
        <p className="text-sm text-muted-foreground">Update your profile information here</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {croppedImage ? (
                <AvatarImage src={croppedImage} alt="Cropped Avatar" />
              ) : (
                <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username} />
              )}
              <AvatarFallback>{profile?.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div>
              <Label htmlFor="picture" className="cursor-pointer hover:underline">
                {croppedImage ? "Change Picture" : "Upload Picture"}
              </Label>
              <Input type="file" id="picture" accept="image/*" className="hidden" onChange={onFileChange} />
              {imageSrc && (
                <div className="mt-2">
                  <div className="relative w-64 h-64">
                    <EasyCrop
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Label htmlFor="zoom" className="text-sm">Zoom:</Label>
                    <Slider
                      id="zoom"
                      defaultValue={[zoom]}
                      min={1}
                      max={3}
                      step={0.1}
                      onValueChange={(value) => setZoom(value[0])}
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={uploadProfilePicture} disabled={isUploading}>
                      {isUploading ? "Uploading..." : "Save Picture"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="shadcn" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write something about yourself"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditProfileForm;
