
import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface FollowRequestItemProps {
  request: FollowRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isHandling: boolean;
}

const FollowRequestItem: React.FC<FollowRequestItemProps> = ({
  request,
  onAccept,
  onReject,
  isHandling
}) => {
  const queryClient = useQueryClient();

  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      // Update the follow request status to accepted
      const { error } = await supabase
        .from("follows")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      // Create a follow notification
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          type: "follow",
          source_user_id: request.follower_id,
          target_user_id: request.following_id,
          is_read: false
        });

      if (notificationError) {
        console.error("Error creating follow notification:", notificationError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Follow request accepted");
    },
    onError: (error) => {
      console.error("Error accepting follow request:", error);
      toast.error("Failed to accept follow request");
    }
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
      toast.success("Follow request rejected");
    },
    onError: (error) => {
      console.error("Error rejecting follow request:", error);
      toast.error("Failed to reject follow request");
    }
  });

  const handleAccept = () => {
    acceptRequestMutation.mutate(request.id);
    onAccept(request.id);
  };

  const handleReject = () => {
    rejectRequestMutation.mutate(request.id);
    onReject(request.id);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={request.follower.avatar_url || ''}
              alt={request.follower.username}
            />
            <AvatarFallback>
              {request.follower.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              @{request.follower.username} wants to follow you
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={isHandling || acceptRequestMutation.isPending}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isHandling || rejectRequestMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FollowRequestItem;
