import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid, Bookmark, Film, User as UserIcon, Settings, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import EditProfileForm from "@/components/profile/EditProfileForm";
import UserPostsGrid from "@/components/profile/UserPostsGrid";
import { ProfileWithCounts } from "@/types/supabase";

const Profile = () => {
  const { username } = useParams<{ username?: string }>();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

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
        const [postsCountResult, followersCountResult, followingCountResult, isFollowingResult] = await Promise.all([
          supabase.from("posts").select("id", { count: "exact" }).eq("user_id", fetchedProfile.id),
          supabase.from("follows").select("id", { count: "exact" }).eq("following_id", fetchedProfile.id),
          supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", fetchedProfile.id),
          user?.id ? supabase.from("follows")
            .select("id")
            .eq("follower_id", user.id)
            .eq("following_id", fetchedProfile.id)
            .single() : { data: null }
        ]);
        
        // Set following state
        setIsFollowing(!!isFollowingResult.data);
        
        return {
          ...fetchedProfile,
          posts_count: postsCountResult.count || 0,
          followers_count: followersCountResult.count || 0,
          following_count: followingCountResult.count || 0,
          is_following: !!isFollowingResult.data
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

  const isOwnProfile = user?.id === profileData?.id;
  
  const handleFollowToggle = async () => {
    if (!user || !profileData) return;
    
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileData.id);
          
        setIsFollowing(false);
        toast.success(`Unfollowed @${profileData.username}`);
      } else {
        // Follow
        await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: profileData.id
          });
          
        // Create notification
        await supabase
          .from("notifications")
          .insert({
            type: "follow",
            source_user_id: user.id,
            target_user_id: profileData.id
          });
          
        setIsFollowing(true);
        toast.success(`Following @${profileData.username}`);
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      toast.error("Failed to update follow status");
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
      <div className="max-w-4xl mx-auto py-6">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
          <Avatar className="h-24 w-24 md:h-32 md:w-32">
            <AvatarImage src={profileData.avatar_url || ""} alt={profileData.username} />
            <AvatarFallback>{profileData.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-4">
              <h1 className="text-xl font-medium flex items-center">
                @{profileData.username}
              </h1>
              
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Edit Profile</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <EditProfileForm onComplete={() => setIsEditProfileOpen(false)} />
                    </DialogContent>
                  </Dialog>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleFollowToggle}>
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                    <Button variant="outline" onClick={handleMessageClick}>Message</Button>
                  </>
                )}
                
                {isOwnProfile && (
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-center md:justify-start gap-6 mb-4">
              <div className="text-center cursor-pointer" onClick={() => {}}>
                <span className="font-medium">{profileData.posts_count}</span>{" "}
                <span className="text-social-text-secondary">posts</span>
              </div>
              <div className="text-center cursor-pointer" onClick={handleViewFollowers}>
                <span className="font-medium">{profileData.followers_count}</span>{" "}
                <span className="text-social-text-secondary">followers</span>
              </div>
              <div className="text-center cursor-pointer" onClick={handleViewFollowing}>
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
            <TabsTrigger value="saved" className="flex-1">
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
            {profileData && <UserPostsGrid userId={profileData.id} />}
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
