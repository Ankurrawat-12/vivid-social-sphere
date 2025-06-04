
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FollowUser {
  id: string;
  follower?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  following?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FollowersFollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  defaultTab?: "followers" | "following";
}

const FollowersFollowingModal: React.FC<FollowersFollowingModalProps> = ({
  isOpen,
  onClose,
  userId,
  defaultTab = "followers"
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: followers = [], isLoading: isLoadingFollowers } = useQuery({
    queryKey: ["followers", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          id,
          follower:profiles!follows_follower_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("following_id", userId)
        .eq("status", "accepted");

      if (error) {
        console.error("Error fetching followers:", error);
        throw error;
      }

      return data as FollowUser[];
    },
    enabled: isOpen,
  });

  const { data: following = [], isLoading: isLoadingFollowing } = useQuery({
    queryKey: ["following", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          id,
          following:profiles!follows_following_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("follower_id", userId)
        .eq("status", "accepted");

      if (error) {
        console.error("Error fetching following:", error);
        throw error;
      }

      return data as FollowUser[];
    },
    enabled: isOpen,
  });

  const handleUserClick = (username: string) => {
    navigate(`/profile/${username}`);
    onClose();
  };

  const renderUserList = (users: FollowUser[], type: "followers" | "following", isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-social-purple"></div>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No {type} yet
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {users.map((user) => {
          const profile = type === "followers" ? user.follower : user.following;
          if (!profile) return null;

          return (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
              onClick={() => handleUserClick(profile.username)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={profile.avatar_url || ''}
                  alt={profile.username}
                />
                <AvatarFallback>
                  {profile.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <p className="font-medium">@{profile.username}</p>
                {profile.display_name && (
                  <p className="text-sm text-muted-foreground">{profile.display_name}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({following.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers" className="mt-4">
            {renderUserList(followers, "followers", isLoadingFollowers)}
          </TabsContent>
          
          <TabsContent value="following" className="mt-4">
            {renderUserList(following, "following", isLoadingFollowing)}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersFollowingModal;
