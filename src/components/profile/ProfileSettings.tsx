
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Archive, Settings, User } from "lucide-react";
import { toast } from "sonner";

interface ProfileSettingsProps {
  onComplete: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onComplete }) => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPrivate, setIsPrivate] = useState(profile?.is_private || false);

  const updatePrivacyMutation = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      if (!profile) throw new Error("No profile found");
      
      const { error } = await supabase
        .from("profiles")
        .update({ is_private: isPrivate })
        .eq("id", profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Privacy setting updated");
    },
    onError: (error) => {
      console.error("Error updating privacy:", error);
      toast.error("Failed to update privacy setting");
    }
  });

  const handlePrivacyToggle = (checked: boolean) => {
    setIsPrivate(checked);
    updatePrivacyMutation.mutate(checked);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth");
      onComplete();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleViewArchive = () => {
    navigate("/archive");
    onComplete();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="private-account">Private Account</Label>
            <p className="text-sm text-muted-foreground">
              When your account is private, only followers can see your posts
            </p>
          </div>
          <Switch
            id="private-account"
            checked={isPrivate}
            onCheckedChange={handlePrivacyToggle}
            disabled={updatePrivacyMutation.isPending}
          />
        </div>
        
        <Separator />
        
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleViewArchive}
        >
          <Archive className="mr-2 h-4 w-4" />
          View Archive
        </Button>
        
        <Separator />
        
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </>
  );
};

export default ProfileSettings;
