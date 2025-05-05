
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid, Bookmark, Film, User as UserIcon, Settings, MessageSquare, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import EditProfileForm from "@/components/profile/EditProfileForm";
import ProfileSettings from "@/components/profile/ProfileSettings";
import UserPostsGrid from "@/components/profile/UserPostsGrid";
import { ProfileWithCounts } from "@/types/supabase";
import { useIsMobile } from "@/hooks/use-mobile";

const Profile = () => {
  const { username } = useParams<{ username?: string }>();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "accepted">("none");

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      try {
        // If no username provided, return current user profile
        if (!username && currentUserProfile) {
          // Get the counts for the current user
          const [postsCountResult, followersCountResult, followingCountResult] = await Promise.all([
            supabase.from("posts").select("id", { count: "exact" }).eq("user_id", user?.id),
            supabase.from("follows").select("id", { count: "exact" }).eq("following_id", user?.id),
            supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", user?.id)
          ]);
          
          return {
            ...currentUserProfile,
            posts_count: postsCountResult.count || 0,
            followers_count: followersCountResult.count || 0,
            following_count: followingCountResult.count || 0,
          } as ProfileWithCounts;
        }
        
        // Otherwise, fetch profile by username
        const { data: fetchedProfile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .single();
          
        if (error || !fetchedProfile) {
          throw new Error("Profile not found");
        }
        
        // Get counts for the fetched profile
        const [postsCountResult, followersCountResult, followingCountResult, followStatusResult] = await Promise.all([
          supabase.from("posts").select("id", { count: "exact" }).eq("user_id", fetchedProfile.id),
          supabase.from("follows").select("id", { count: "exact" }).eq("following_id", fetchedProfile.id),
          supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", fetchedProfile.id),
          user?.id ? supabase.from("follows")
            .select("*")
            .eq("follower_id", user.id)
            .eq("following_id", fetchedProfile.id)
            .single() : { data: null, error: null }
        ]);
        
        // Set following state based on status
        const followData = followStatusResult.data;
        let currentFollowStatus: "none" | "pending" | "accepted" = "none";
        
        if (followData) {
          currentFollowStatus = (followData.status as "pending" | "accepted") || "accepted";
          setFollowStatus(currentFollowStatus);
        }
        
        return {
          ...fetchedProfile,
          posts_count: postsCountResult.count || 0,
          followers_count: followersCountResult.count || 0,
          following_count: followingCountResult.count || 0,
          follow_status: currentFollowStatus
        } as ProfileWithCounts;
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
        return null;
      }
    }
  });

  // Redirect to the current user's profile if no username is provided
  useEffect(() => {
    if (!username && currentUserProfile?.username) {
      navigate(`/profile/${currentUserProfile.username}`);
    }
  }, [username, currentUserProfile, navigate]);

  // Refactor follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ action }: { action: "follow" | "unfollow" }) => {
      if (!user || !profileData) throw new Error("User or profile data missing");
      
      if (action === "follow") {
        // For follow, we'll use insert and handle the status through RLS policies later
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: profileData.id
          });
          
        if (error) throw error;
        
        // Create notification for the follow action
        await supabase
          .from("notifications")
          .insert({
            type: "follow",
            source_user_id: user.id,
            target_user_id: profileData.id
          });
          
        return "accepted"; // For now, always accept follows
      } else {
        // For unfollow, simply delete the record
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileData.id);
          
        if (error) throw error;
        
        return "none";
      }
    },
    onSuccess: (status) => {
      setFollowStatus(status);
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
      
      if (status === "pending") {
        toast.success("Follow request sent");
      } else if (status === "accepted") {
        toast.success(`Following @${profileData?.username}`);
      } else {
        toast.success(`Unfollowed @${profileData?.username}`);
      }
    },
    onError: (error) => {
      console.error("Error updating follow status:", error);
      toast.error("Failed to update follow status");
    }
  });
  
  const isOwnProfile = user?.id === profileData?.id;
  const isFollowing = followStatus === "accepted";
  const isRequestPending = followStatus === "pending";
  const isPrivateAccount = profileData?.is_private;
  const canViewContent = isOwnProfile || (isPrivateAccount ? isFollowing : true);

  // Fix comparison to use correct types
  const handleFollowToggle = async () => {
    if (isFollowing || isRequestPending) {
      followMutation.mutate({ action: "unfollow" });
    } else {
      followMutation.mutate({ action: "follow" });
    }
  };

  const handleMessageClick = () => {
    if (profileData) {
      navigate("/messages", { state: { selectedUser: profileData } });
    }
  };

  const handleViewFollowers = () => {
    // To be implemented: Open dialog showing followers list
    toast.info("Followers list feature coming soon!");
  };

  const handleViewFollowing = () => {
    // To be implemented: Open dialog showing following list
    toast.info("Following list feature coming soon!");
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-6">
          <div className="animate-pulse space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="rounded-full bg-muted h-24 w-24 md:h-32 md:w-32"></div>
              <div className="w-full space-y-4">
                <div className="h-7 bg-muted rounded w-1/3"></div>
                <div className="flex gap-6">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profileData) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-6 text-center">
          <h1 className="text-2xl font-semibold">Profile not found</h1>
          <p className="text-muted-foreground mt-2">The user you're looking for doesn't exist or has been removed.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Profile Header */}
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
                      <DialogContent className="sm:max-w-[425px]">
                        <EditProfileForm onComplete={() => setIsEditProfileOpen(false)} />
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size={isMobile ? "sm" : "default"}>
                          <Settings className="h-4 w-4 mr-1" /> Settings
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <ProfileSettings onComplete={() => setIsSettingsOpen(false)} />
                      </DialogContent>
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

            <div className="flex justify-center md:justify-start gap-6 mb-4">
              <div className="text-center cursor-pointer">
                <span className="font-medium">{profileData.posts_count}</span>{" "}
                <span className="text-social-text-secondary">posts</span>
              </div>
              <div className="text-center cursor-pointer">
                <span className="font-medium">{profileData.followers_count}</span>{" "}
                <span className="text-social-text-secondary">followers</span>
              </div>
              <div className="text-center cursor-pointer">
                <span className="font-medium">{profileData.following_count}</span>{" "}
                <span className="text-social-text-secondary">following</span>
              </div>
            </div>

            <div>
              <h2 className="font-medium">{profileData.display_name || profileData.username}</h2>
              <p className="text-sm whitespace-pre-line">{profileData.bio || "No bio yet."}</p>
            </div>
          </div>
        </div>

        {/* Profile Content Tabs */}
        <Tabs defaultValue="posts">
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1">
              <Grid className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex-1" disabled={!isOwnProfile}>
              <Bookmark className="h-4 w-4 mr-2" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex-1">
              <Film className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="tagged" className="flex-1">
              <UserIcon className="h-4 w-4 mr-2" />
              Tagged
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-6">
            {profileData && <UserPostsGrid userId={profileData.id} profile={profileData} />}
          </TabsContent>
          
          <TabsContent value="saved" className="mt-6">
            <div className="h-40 flex items-center justify-center text-social-text-secondary">
              {isOwnProfile ? "No saved posts yet" : "This tab is only visible to the profile owner"}
            </div>
          </TabsContent>
          
          <TabsContent value="videos">
            <div className="h-40 flex items-center justify-center text-social-text-secondary">
              No videos yet
            </div>
          </TabsContent>
          
          <TabsContent value="tagged">
            <div className="h-40 flex items-center justify-center text-social-text-secondary">
              No tagged posts
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;
