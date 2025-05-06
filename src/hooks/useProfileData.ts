import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileWithCounts } from "@/types/supabase";
import { toast } from "sonner";

// Define the follow status type
export type FollowStatus = "none" | "pending" | "accepted";

export const useProfileData = (username: string | undefined) => {
  const { user, profile: currentUserProfile } = useAuth();
  const queryClient = useQueryClient();
  const [followStatus, setFollowStatus] = useState<FollowStatus>("none");

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
        let currentFollowStatus: FollowStatus = "none";
        
        if (followData) {
          currentFollowStatus = (followData.status as FollowStatus) || "accepted";
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
          
        return "accepted" as FollowStatus; // For now, always accept follows
      } else {
        // For unfollow, simply delete the record
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileData.id);
          
        if (error) throw error;
        
        return "none" as FollowStatus;
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

  // Computed values for the profile
  const isOwnProfile = user?.id === profileData?.id;
  const isFollowing = followStatus === "accepted";
  const isRequestPending = followStatus === "pending";
  const isPrivateAccount = profileData?.is_private;
  const canViewContent = isOwnProfile || (isPrivateAccount ? isFollowing : true);

  return {
    profileData,
    isLoading,
    followStatus,
    followMutation,
    isOwnProfile,
    isFollowing,
    isRequestPending,
    isPrivateAccount,
    canViewContent
  };
};
