
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FollowRequestItem from "@/components/notifications/FollowRequestItem";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowRequests } from "@/hooks/useFollowRequests";
import { supabase } from "@/integrations/supabase/client";
import { Notification, Profile } from "@/types/supabase";

interface NotificationWithUser extends Notification {
  source_user: Profile;
}

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { followRequests, isLoading: isLoadingRequests, handleRequest, isHandling } = useFollowRequests();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          source_user:source_user_id(*)
        `)
        .eq("target_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        toast.error("Failed to load notifications");
        throw error;
      }

      return data as unknown as NotificationWithUser[];
    },
    enabled: !!user,
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: string, isRead: boolean }) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: isRead })
        .eq("id", id);

      if (error) {
        console.error("Error updating notification:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsCount"] });
    },
    onError: () => {
      toast.error("Failed to update notification");
    },
  });

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate({ id: notification.id, isRead: true });
    }

    // Navigate based on notification type
    switch (notification.type) {
      case "like":
      case "comment":
      case "post":
        if (notification.post_id) {
          navigate(`/post/${notification.post_id}`);
        }
        break;
      case "follow":
        navigate(`/profile/${notification.source_user.username}`);
        break;
      case "message":
        navigate("/messages");
        break;
      case "mention":
        if (notification.post_id) {
          navigate(`/post/${notification.post_id}`);
        }
        break;
      default:
        break;
    }
  };

  // Get notification icon and text based on type
  const getNotificationContent = (notification: NotificationWithUser) => {
    const username = notification.source_user.username;
    
    switch (notification.type) {
      case "like":
        return `@${username} liked your post`;
      case "comment":
        return `@${username} commented on your post: "${notification.content}"`;
      case "follow":
        return `@${username} started following you`;
      case "follow_request":
        return `@${username} wants to follow you`;
      case "message":
        return `@${username} sent you a message: "${notification.content}"`;
      case "mention":
        return `@${username} mentioned you in a post`;
      case "post":
        return `@${username} shared a new post: "${notification.content}"`;
      default:
        return "New notification";
    }
  };

  // Subscribe to real-time notifications
  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `target_user_id=eq.${user.id}`,
        },
        (payload) => {
          toast.info("You have a new notification");
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notificationsCount"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const handleFollowRequest = (requestId: string, action: "accept" | "reject") => {
    handleRequest({ requestId, action });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="requests">Follow Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-social-purple"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification: NotificationWithUser) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-colors ${
                      notification.is_read ? "bg-card" : "bg-muted/40"
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={notification.source_user.avatar_url || ''}
                            alt={notification.source_user.username || ''}
                          />
                          <AvatarFallback>
                            {notification.source_user.username?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <p className={`text-sm ${!notification.is_read && "font-medium"}`}>
                            {getNotificationContent(notification)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <Checkbox
                          checked={notification.is_read}
                          onCheckedChange={(checked) => {
                            markAsReadMutation.mutate({
                              id: notification.id,
                              isRead: checked as boolean,
                            });
                            // Stop propagation to prevent navigation when clicking checkbox
                            event?.stopPropagation();
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="requests" className="mt-6">
            {isLoadingRequests ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-social-purple"></div>
              </div>
            ) : followRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No follow requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {followRequests.map((request) => (
                  <FollowRequestItem
                    key={request.id}
                    request={request}
                    onAccept={(requestId) => handleFollowRequest(requestId, "accept")}
                    onReject={(requestId) => handleFollowRequest(requestId, "reject")}
                    isHandling={isHandling}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Notifications;
