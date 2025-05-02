
import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import { mockNotifications } from "@/data/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const Notifications = () => {
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
      default:
        return null;
    }
  };

  const getNotificationText = (notification: any) => {
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
        
        <div className="space-y-4">
          {mockNotifications.map((notification) => (
            <div 
              key={notification.id} 
              className={cn(
                "p-4 border border-border rounded-md flex items-center gap-4",
                !notification.read && "bg-secondary"
              )}
            >
              <div className="flex-shrink-0">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={notification.sourceUser.profilePicture} 
                    alt={notification.sourceUser.username} 
                  />
                  <AvatarFallback>
                    {notification.sourceUser.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{notification.sourceUser.username}</span>
                  <span>{getNotificationText(notification)}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Notifications;
