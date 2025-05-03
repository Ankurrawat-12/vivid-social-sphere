import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, UserPlus, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Notification } from "@/types/supabase";

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch notifications from Supabase
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!user) return [];

      // Fetch notifications with the source user's profile
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          source_user:source_user_id(id, username, avatar_url, display_name)
        `)
        .eq("target_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }

      // Count unread notifications
      const unreadCount = data.filter((n) => !n.is_read).length;
      setNotificationCount(unreadCount);

      // Mark notifications as read
      if (unreadCount > 0) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("target_user_id", user.id)
          .eq("is_read", false);
      }

      return data as Notification[];
    },
    enabled: !!user,
  });

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications_channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `target_user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update notification count
          setNotificationCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-red-500" />;
      case "comment":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-social-purple" />;
      case "mention":
        return <Bell className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case "like":
        return "liked your post.";
      case "comment":
        return "commented on your post.";
      case "follow":
        return "started following you.";
      case "message":
        return "sent you a message.";
      case "mention":
        return "mentioned you in a comment.";
      default:
        return "";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-social-purple"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={cn(
                  "p-4 border border-border rounded-md flex items-center gap-4",
                  !notification.is_read && "bg-muted"
                )}
              >
                <div className="flex-shrink-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={notification.source_user?.avatar_url || ''} 
                      alt={notification.source_user?.username || ''} 
                    />
                    <AvatarFallback>
                      {notification.source_user?.username?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{notification.source_user?.username || 'User'}</span>
                    <span>{getNotificationText(notification)}</span>
                  </div>
                  {notification.content && (
                    <p className="text-sm mt-1 text-muted-foreground">{notification.content}</p>
                  )}
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default NotificationsPage;
