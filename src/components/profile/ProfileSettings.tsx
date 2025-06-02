
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { Archive, Settings, User } from "lucide-react";

interface ProfileSettingsProps {
  onComplete: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onComplete }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

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
