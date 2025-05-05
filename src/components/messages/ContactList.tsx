
import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Profile } from "@/types/supabase";
import { MessageWithProfile } from "@/types/supabase";

interface ContactListProps {
  profiles: Profile[];
  selectedUser: Profile | null;
  messages: MessageWithProfile[];
  isLoadingProfiles: boolean;
  onSelectUser: (profile: Profile) => void;
  currentUserId: string;
  isMobile?: boolean;
  showInMobile?: boolean;
}

const ContactList: React.FC<ContactListProps> = ({
  profiles,
  selectedUser,
  messages,
  isLoadingProfiles,
  onSelectUser,
  currentUserId,
  isMobile = false,
  showInMobile = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter contacts by search query
  const filteredProfiles = profiles.filter(profile => 
    profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const contactListClasses = cn(
    "flex flex-col border-r border-border",
    {
      "w-full": isMobile && showInMobile,
      "hidden md:flex md:w-1/3 lg:w-1/4": !isMobile && !showInMobile,
      "md:flex md:w-1/3 lg:w-1/4": !isMobile || !showInMobile
    }
  );

  return (
    <div className={contactListClasses}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-lg">Messages</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoadingProfiles ? (
          <div className="p-4 text-center">Loading contacts...</div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? "No contacts found" : "No contacts yet"}
          </div>
        ) : (
          filteredProfiles.map((profile) => {
            const lastMessage = messages.filter(
              (m) => (m.sender_id === profile.id || m.recipient_id === profile.id)
            ).pop();
            
            // Count unread messages
            const unreadCount = messages.filter(
              (m) => m.sender_id === profile.id && !m.is_read && m.recipient_id === currentUserId
            ).length;
            
            return (
              <div
                key={profile.id}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted transition-colors",
                  selectedUser?.id === profile.id && "bg-muted",
                  unreadCount > 0 && "bg-muted/60"
                )}
                onClick={() => onSelectUser(profile)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.avatar_url || ''} alt={profile.username || ''} />
                  <AvatarFallback>
                    {profile.username?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm truncate">
                      {profile.display_name || profile.username}
                    </h3>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(lastMessage.created_at), {
                          addSuffix: false,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    {lastMessage && (
                      <p className={cn(
                        "text-sm truncate",
                        unreadCount > 0 ? "font-medium" : "text-muted-foreground"
                      )}>
                        {lastMessage.content}
                      </p>
                    )}
                    {unreadCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-5 w-5 text-xs bg-social-purple text-white rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ContactList;
