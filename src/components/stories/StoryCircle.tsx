
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "@/types";

interface StoryCircleProps {
  user: User;
  viewed?: boolean;
  size?: "sm" | "md" | "lg";
}

const StoryCircle = ({ user, viewed = false, size = "md" }: StoryCircleProps) => {
  const sizeClasses = {
    sm: "h-14 w-14",
    md: "h-16 w-16",
    lg: "h-20 w-20",
  };
  
  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(!viewed && "story-avatar animate-story-ring")}>
        <Avatar className={cn(sizeClasses[size])}>
          <AvatarImage src={user.profilePicture} alt={user.username} />
          <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
      <span className={cn("text-xs truncate max-w-[64px]", textSizeClasses[size])}>
        {user.username}
      </span>
    </div>
  );
};

export default StoryCircle;
