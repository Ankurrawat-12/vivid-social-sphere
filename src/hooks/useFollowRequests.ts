
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FollowRequest {
  id: string;
  follower_id: string;
  following_id: string;
  status: "pending" | "accepted";
  created_at: string;
  follower: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useFollowRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch pending follow requests for the current user
  const { data: followRequests = [], isLoading } = useQuery({
    queryKey: ["followRequests"],
    queryFn: async () => {
      if (!user) return [];

      console.log("Fetching follow requests for user:", user.id);

      const { data, error } = await supabase
        .from("follows")
        .select(`
          id,
          follower_id,
          following_id,
          status,
          created_at,
          follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq("following_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching follow requests:", error);
        throw error;
      }

      console.log("Follow requests data:", data);
      return data as unknown as FollowRequest[];
    },
    enabled: !!user,
  });

  // Handle follow request (accept/reject)
  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: "accept" | "reject" }) => {
      if (action === "accept") {
        // Update status to accepted
        const { error } = await supabase
          .from("follows")
          .update({ status: "accepted" })
          .eq("id", requestId);

        if (error) throw error;

        // Create notification for accepted follow
        const request = followRequests.find(r => r.id === requestId);
        if (request) {
          await supabase
            .from("notifications")
            .insert({
              type: "follow",
              source_user_id: user?.id,
              target_user_id: request.follower_id,
              content: "accepted your follow request"
            });
        }
      } else {
        // Delete the follow request
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("id", requestId);

        if (error) throw error;
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      if (action === "accept") {
        toast.success("Follow request accepted");
      } else {
        toast.success("Follow request rejected");
      }
    },
    onError: (error) => {
      console.error("Error handling follow request:", error);
      toast.error("Failed to handle follow request");
    }
  });

  return {
    followRequests,
    isLoading,
    handleRequest: handleRequestMutation.mutate,
    isHandling: handleRequestMutation.isPending
  };
};
