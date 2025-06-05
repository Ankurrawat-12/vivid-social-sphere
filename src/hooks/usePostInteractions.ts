
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const usePostInteractions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Like/unlike post
  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked, postUserId }: { postId: string; isLiked: boolean; postUserId: string }) => {
      if (!user) throw new Error("User not authenticated");

      if (isLiked) {
        // Unlike the post
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Like the post
        const { error } = await supabase
          .from("likes")
          .insert({
            post_id: postId,
            user_id: user.id
          });

        if (error) throw error;

        // Create notification for post owner (if not liking own post)
        if (postUserId !== user.id) {
          await supabase
            .from("notifications")
            .insert({
              type: "like",
              source_user_id: user.id,
              target_user_id: postUserId,
              post_id: postId,
              content: "liked your post",
              is_read: false
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  });

  // Add comment
  const commentMutation = useMutation({
    mutationFn: async ({ postId, content, postUserId }: { postId: string; content: string; postUserId: string }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content
        });

      if (error) throw error;

      // Create notification for post owner (if not commenting on own post)
      if (postUserId !== user.id) {
        await supabase
          .from("notifications")
          .insert({
            type: "comment",
            source_user_id: user.id,
            target_user_id: postUserId,
            post_id: postId,
            content: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
            is_read: false
          });
      }

      // Check for mentions in the comment
      const mentionRegex = /@(\w+)/g;
      const mentions = content.match(mentionRegex);
      
      if (mentions) {
        for (const mention of mentions) {
          const username = mention.slice(1); // Remove @ symbol
          
          // Find the mentioned user
          const { data: mentionedUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", username)
            .single();

          if (mentionedUser && mentionedUser.id !== user.id) {
            await supabase
              .from("notifications")
              .insert({
                type: "mention",
                source_user_id: user.id,
                target_user_id: mentionedUser.id,
                post_id: postId,
                content: `mentioned you in a comment: "${content.substring(0, 30)}..."`,
                is_read: false
              });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Comment added");
    },
    onError: (error) => {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  });

  return {
    likeMutation,
    commentMutation
  };
};
