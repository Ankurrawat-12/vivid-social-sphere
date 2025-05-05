
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  isPrivate: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const ProfileSettings = ({ onComplete }: { onComplete?: () => void }) => {
  const { user, profile, refreshProfile } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isPrivate: profile?.is_private || false,
    },
  });

  React.useEffect(() => {
    if (profile) {
      form.reset({
        isPrivate: profile.is_private || false,
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (!user) return;
      
      // Add is_private column to profiles table if it doesn't exist
      const { error } = await supabase
        .from("profiles")
        .update({ 
          // Only update the is_private field
          is_private: values.isPrivate 
        } as any) // Use type assertion to bypass TypeScript check
        .eq("id", user.id);
        
      if (error) {
        console.error("Error details:", error);
        throw error;
      }
      
      toast.success("Profile settings updated successfully");
      refreshProfile?.();
      onComplete?.();
    } catch (error) {
      console.error("Error updating profile settings:", error);
      toast.error("Failed to update profile settings");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Profile Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your privacy and account settings</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="isPrivate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Private Account</FormLabel>
                  <FormDescription>
                    When your account is private, only approved followers can see your content
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
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

export default ProfileSettings;
