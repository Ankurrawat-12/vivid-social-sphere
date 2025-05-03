
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Profile } from "@/types/supabase";

interface ChatHeaderProps {
  user: Profile;
  isOnline?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ user, isOnline }) => {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url || ''} alt={user.username || ''} />
            <AvatarFallback>
              {user.username?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {isOnline !== undefined && (
            <span 
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}
            ></span>
          )}
        </div>
        <div>
          <h3 className="font-medium">
            {user.display_name || user.username}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
