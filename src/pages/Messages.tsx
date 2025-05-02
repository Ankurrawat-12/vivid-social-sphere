
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Search, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Profile, MessageWithProfile } from "@/types/supabase";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all profiles for the contacts list
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id || "")
        .order("username", { ascending: true });

      if (error) {
        console.error("Error fetching profiles:", error);
        toast.error("Failed to load contacts");
        throw error;
      }

      return data as Profile[];
    },
  });

  // Fetch messages between current user and selected user
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
  } = useQuery({
    queryKey: ["messages", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];

      // Updated query with explicit column hinting
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender_profile:sender_id(id, username, avatar_url, display_name),
          recipient_profile:recipient_id(id, username, avatar_url, display_name)
        `)
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${user?.id})`)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
        throw error;
      }

      // Mark messages as read
      const unreadMessages = data.filter(
        message => message.recipient_id === user?.id && !message.is_read
      );
      
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id);
        markMessagesAsRead(messageIds);
      }

      return data as MessageWithProfile[];
    },
    enabled: !!selectedUser && !!user,
  });

  // Mark messages as read
  const markMessagesAsRead = async (messageIds: string[]) => {
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .in("id", messageIds);
      
    if (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      if (!selectedUser || !user) throw new Error("Cannot send message");
      
      const newMessage = {
        sender_id: user.id,
        recipient_id: selectedUser.id,
        content: messageContent,
      };
      
      const { data, error } = await supabase
        .from("messages")
        .insert(newMessage)
        .select(`
          *,
          sender_profile:sender_id(id, username, avatar_url, display_name),
          recipient_profile:recipient_id(id, username, avatar_url, display_name)
        `)
        .single();
        
      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }
      
      return data as MessageWithProfile;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUser?.id] });
      scrollToBottom();
    },
    onError: () => {
      toast.error("Failed to send message. Please try again.");
    },
  });

  // Filter contacts by search query
  const filteredProfiles = profiles.filter(profile => 
    profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // If a new message is from the currently selected user, refresh the messages
          if (selectedUser && payload.new.sender_id === selectedUser.id) {
            queryClient.invalidateQueries({ queryKey: ["messages", selectedUser.id] });
            
            // Mark as read if the chat is open
            markMessagesAsRead([payload.new.id]);
          } else {
            // Notify about new message from someone else
            toast.info(`New message from ${payload.new.sender_id}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser, queryClient]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Get the last message for each contact to show in the sidebar
  const getLastMessageByUser = (profileId: string) => {
    const userMessages = messages.filter(
      (message) => 
        message.sender_id === profileId || 
        message.recipient_id === profileId
    );
    
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  };

  const handleUserSelect = (profile: Profile) => {
    setSelectedUser(profile);
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-130px)] mt-4 flex border border-border rounded-md overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-1/3 lg:w-1/4 flex-col border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-lg">Messages</h2>
              <Button variant="ghost" size="icon">
                <Edit className="h-5 w-5" />
              </Button>
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
                  (m) => m.sender_id === profile.id && !m.is_read && m.recipient_id === user?.id
                ).length;
                
                return (
                  <div
                    key={profile.id}
                    className={cn(
                      "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted transition-colors",
                      selectedUser?.id === profile.id && "bg-muted",
                      unreadCount > 0 && "bg-muted/60"
                    )}
                    onClick={() => handleUserSelect(profile)}
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

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedUser.avatar_url || ''} alt={selectedUser.username || ''} />
                    <AvatarFallback>
                      {selectedUser.username?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {selectedUser.display_name || selectedUser.username}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      @{selectedUser.username}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                {isLoadingMessages ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-social-purple"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isCurrentUser = message.sender_id === user?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "mb-4 flex",
                          isCurrentUser ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2",
                            isCurrentUser
                              ? "bg-social-purple text-white rounded-tr-none"
                              : "bg-muted rounded-tl-none"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    placeholder="Message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground">
              <div className="mb-4">
                <Send className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-medium mb-2">Your Messages</h3>
              <p className="text-center max-w-xs">
                Send private messages to other users on VividSocial
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
