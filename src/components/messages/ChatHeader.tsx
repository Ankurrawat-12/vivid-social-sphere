
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Info, ArrowLeft } from "lucide-react";
import { Profile } from "@/types/supabase";

interface ChatHeaderProps {
  user: Profile;
  isOnline?: boolean;
  onBackClick?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  user, 
  isOnline = false,
  onBackClick
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-border">
      <div className="flex items-center gap-3">
        {onBackClick && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:hidden mr-2"
            onClick={onBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || ''} alt={user.username || ''} />
          <AvatarFallback>
            {user.username?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">
            {user.display_name || user.username}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center">
            {isOnline ? (
              <>
                <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
                Active now
              </>
            ) : (
              'Offline'
            )}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="icon">
        <Info className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default ChatHeader;
