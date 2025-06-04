import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileWithCounts } from "@/types/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Lock, MessageSquare, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import FollowersFollowingModal from "./FollowersFollowingModal";

interface ProfileHeaderProps {
  profileData: ProfileWithCounts;
  isOwnProfile: boolean;
  isFollowing: boolean;
  isRequestPending: boolean;
  isPrivateAccount: boolean;
  followMutation: {
    mutate: (data: { action: "follow" | "unfollow" }) => void;
    isPending: boolean;
  };
  isEditProfileOpen: boolean;
  setIsEditProfileOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  isOwnProfile,
  isFollowing,
  isRequestPending,
  isPrivateAccount,
  followMutation,
  isEditProfileOpen,
  setIsEditProfileOpen,
  isSettingsOpen,
  setIsSettingsOpen,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");

  const handleFollowToggle = () => {
    if (isFollowing || isRequestPending) {
      followMutation.mutate({ action: "unfollow" });
    } else {
      followMutation.mutate({ action: "follow" });
    }
  };

  const handleFollowersClick = () => {
    setFollowersModalTab("followers");
    setFollowersModalOpen(true);
  };

  const handleFollowingClick = () => {
    setFollowersModalTab("following");
    setFollowersModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
        <Avatar className="h-24 w-24 md:h-32 md:w-32">
          <AvatarImage src={profileData.avatar_url || ""} alt={profileData.username} />
          <AvatarFallback>{profileData.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-4">
            <h1 className="text-xl font-medium flex items-center gap-2">
              @{profileData.username}
              {isPrivateAccount && <Lock className="h-4 w-4 text-muted-foreground" />}
            </h1>
            
            <div className="flex gap-2 flex-wrap justify-center md:justify-start">
              {isOwnProfile ? (
                <>
                  <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size={isMobile ? "sm" : "default"}>Edit Profile</Button>
                    </DialogTrigger>
                  </Dialog>
                  
                  <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size={isMobile ? "sm" : "default"}>
                        <Settings className="h-4 w-4 mr-1" /> Settings
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </>
              ) : (
                <>
                  <Button 
                    variant={isFollowing ? "outline" : "default"} 
                    size={isMobile ? "sm" : "default"}
                    onClick={handleFollowToggle}
                    disabled={followMutation.isPending}
                  >
                    {followMutation.isPending ? "Loading..." : 
                      isRequestPending ? "Requested" : 
                      isFollowing ? "Following" : "Follow"}
                  </Button>
                  
                  {isFollowing && (
                    <Button 
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      onClick={() => navigate("/messages", { state: { selectedUser: profileData } })}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" /> Message
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <ProfileStats 
            postsCount={profileData.posts_count}
            followersCount={profileData.followers_count}
            followingCount={profileData.following_count}
            onFollowersClick={handleFollowersClick}
            onFollowingClick={handleFollowingClick}
          />

          <div>
            <h2 className="font-medium">{profileData.display_name || profileData.username}</h2>
            <p className="text-sm whitespace-pre-line">{profileData.bio || "No bio yet."}</p>
          </div>
        </div>
      </div>

      <FollowersFollowingModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        userId={profileData.id}
        defaultTab={followersModalTab}
      />
    </>
  );
};

// Stats component (small, so keeping it in the same file)
interface ProfileStatsProps {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ 
  postsCount, 
  followersCount, 
  followingCount, 
  onFollowersClick, 
  onFollowingClick 
}) => {
  return (
    <div className="flex justify-center md:justify-start gap-6 mb-4">
      <div className="text-center">
        <span className="font-medium">{postsCount}</span>{" "}
        <span className="text-social-text-secondary">posts</span>
      </div>
      <div className="text-center cursor-pointer hover:opacity-80" onClick={onFollowersClick}>
        <span className="font-medium">{followersCount}</span>{" "}
        <span className="text-social-text-secondary">followers</span>
      </div>
      <div className="text-center cursor-pointer hover:opacity-80" onClick={onFollowingClick}>
        <span className="font-medium">{followingCount}</span>{" "}
        <span className="text-social-text-secondary">following</span>
      </div>
    </div>
  );
};

export default ProfileHeader;
