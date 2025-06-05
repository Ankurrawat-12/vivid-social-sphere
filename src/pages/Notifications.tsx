
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FollowRequestItem from "@/components/notifications/FollowRequestItem";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowRequests } from "@/hooks/useFollowRequests";
import { supabase } from "@/integrations/supabase/client";

interface NotificationWithUser {
  id: string;
  type: string;
  source_user_id: string;
  target_user_id: string;
  post_id?: string | null;
  message_id?: string | null;
  content?: string | null;
  is_read: boolean;
  created_at: string;
  source_user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { followRequests, isLoading: isLoadingRequests, handleRequest, isHandling } = useFollowRequests();

  // Fetch notifications with proper filtering
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          type,
          source_user_id,
          target_user_id,
          post_id,
          message_id,
          content,
          is_read,
          created_at
        `)
        .eq("target_user_id", user.id)
        .neq("type", "follow_request") // Exclude follow requests from general notifications
        .neq("type", "message") // Exclude message notifications
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }

      // Filter out notifications with generic content or null content
      const filteredData = data.filter(notification => {
        return notification.content && 
               notification.content !== "New notification" &&
               notification.content.trim() !== "";
      });

      // Fetch source user data for each notification
      const notificationsWithUsers = await Promise.all(
        filteredData.map(async (notification) => {
          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", notification.source_user_id)
            .single();

          if (userError) {
            console.error("Error fetching user data:", userError);
            return {
              ...notification,
              source_user: {
                id: notification.source_user_id,
                username: "Unknown",
                display_name: null,
                avatar_url: null,
              },
            };
          }

          return {
            ...notification,
            source_user: userData,
          };
        })
      );

      return notificationsWithUsers as NotificationWithUser[];
    },
    enabled: !!user,
  });

  // Check if current user is following the notification source user
  const { data: followingStatus = {} } = useQuery({
    queryKey: ["followingStatus", notifications.map(n => n.source_user_id)],
    queryFn: async () => {
      if (!user || notifications.length === 0) return {};

      const sourceUserIds = [...new Set(notifications.map(n => n.source_user_id))];
      
      const { data, error } = await supabase
        .from("follows")
        .select("following_id, status")
        .eq("follower_id", user.id)
        .in("following_id", sourceUserIds);

      if (error) {
        console.error("Error fetching following status:", error);
        return {};
      }

      return data.reduce((acc, follow) => {
        acc[follow.following_id] = follow.status;
        return acc;
      }, {} as Record<string, string>);
    },
    enabled: !!user && notifications.length > 0,
  });

  // Follow back mutation
  const followBackMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: user!.id,
          following_id: targetUserId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followingStatus"] });
      toast.success("Follow request sent");
    },
    onError: (error) => {
      console.error("Error following user:", error);
      toast.error("Failed to follow user");
    }
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
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
  const handleNotificationClick = (notification: NotificationWithUser) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case "like":
      case "comment":
        if (notification.post_id) {
          navigate(`/post/${notification.post_id}`);
        }
        break;
      case "follow":
        if (notification.source_user) {
          navigate(`/profile/${notification.source_user.username}`);
        }
        break;
      case "mention":
        if (notification.post_id) {
          navigate(`/post/${notification.post_id}`);
        }
        break;
      case "post":
        if (notification.post_id) {
          navigate(`/post/${notification.post_id}`);
        }
        break;
      default:
        break;
    }
  };

  // Get notification content based on type
  const getNotificationContent = (notification: NotificationWithUser) => {
    const username = notification.source_user?.username || 'Unknown';
    
    switch (notification.type) {
      case "like":
        return `@${username} liked your post`;
      case "comment":
        return `@${username} commented on your post: "${notification.content}"`;
      case "follow":
        return `@${username} started following you`;
      case "mention":
        return `@${username} mentioned you in a post`;
      case "post":
        return `@${username} shared a new post: "${notification.content}"`;
      default:
        return notification.content || "New notification";
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
          queryClient.invalidateQueries({ queryKey: ["followRequests"] });
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
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      notification.is_read ? "bg-card" : "bg-muted/40"
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={notification.source_user?.avatar_url || ''}
                            alt={notification.source_user?.username || ''}
                          />
                          <AvatarFallback>
                            {notification.source_user?.username?.substring(0, 2).toUpperCase() || 'U'}
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
                        
                        <div className="flex items-center gap-2">
                          {notification.type === "follow" && 
                           !followingStatus[notification.source_user_id] && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                followBackMutation.mutate(notification.source_user_id);
                              }}
                              disabled={followBackMutation.isPending}
                            >
                              Follow Back
                            </Button>
                          )}
                        </div>
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
