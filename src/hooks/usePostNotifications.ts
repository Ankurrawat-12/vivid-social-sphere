
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePostNotifications = () => {
  const { user } = useAuth();

  const notifyFollowersOfNewPost = async (postId: string, caption: string) => {
    if (!user) return;

    try {
      // Get all followers of the current user
      const { data: followers, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id)
        .eq("status", "accepted");

      if (error) {
        console.error("Error fetching followers:", error);
        return;
      }

      if (followers && followers.length > 0) {
        // Create notifications for all followers
        const notifications = followers.map(follow => ({
          type: "post" as const,
          source_user_id: user.id,
          target_user_id: follow.follower_id,
          post_id: postId,
          content: caption ? caption.substring(0, 50) + (caption.length > 50 ? "..." : "") : "shared a new post",
          is_read: false
        }));

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notificationError) {
          console.error("Error creating post notifications:", notificationError);
        }
      }
    } catch (error) {
      console.error("Error notifying followers of new post:", error);
    }
  };

  return { notifyFollowersOfNewPost };
};
