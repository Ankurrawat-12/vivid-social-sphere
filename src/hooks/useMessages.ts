
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Profile, MessageWithProfile } from "@/types/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useMessages = (selectedUser: Profile | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  
  // Fetch messages between current user and selected user
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
  } = useQuery({
    queryKey: ["messages", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser || !user) return [];

      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:sender_id(id, username, avatar_url, display_name),
          recipient:recipient_id(id, username, avatar_url, display_name)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
        throw error;
      }

      // Mark messages as read
      const unreadMessages = data.filter(
        message => message.recipient_id === user.id && !message.is_read
      );
      
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id);
        markMessagesAsRead(messageIds);
      }

      return data as unknown as MessageWithProfile[];
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
    mutationFn: async ({ messageContent, file }: { messageContent: string, file?: File }) => {
      if (!selectedUser || !user) throw new Error("Cannot send message");
      
      let media_url = null;
      let media_type = null;
      
      // Upload file if provided
      if (file) {
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${user.id}/${selectedUser.id}/${fileName}`;
          
          // Determine media type
          if (file.type.startsWith("image/")) {
            media_type = "image";
          } else if (file.type.startsWith("video/")) {
            media_type = "video";
          } else if (file.type.startsWith("audio/")) {
            media_type = "audio";
          } else {
            media_type = "file";
          }
          
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from("messages")
            .upload(filePath, file);
            
          if (uploadError) {
            console.error("Error uploading file:", uploadError);
            throw uploadError;
          }
          
          const { data: publicUrlData } = supabase.storage
            .from("messages")
            .getPublicUrl(filePath);
            
          media_url = publicUrlData.publicUrl;
        } catch (error) {
          console.error("Error handling file upload:", error);
          toast.error("Failed to upload media file");
          throw error;
        }
      }
      
      const newMessage = {
        sender_id: user.id,
        recipient_id: selectedUser.id,
        content: messageContent,
        media_url,
        media_type,
      };
      
      const { data, error } = await supabase
        .from("messages")
        .insert(newMessage)
        .select(`
          *,
          sender:sender_id(id, username, avatar_url, display_name),
          recipient:recipient_id(id, username, avatar_url, display_name)
        `)
        .single();
        
      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }
      
      // Create notification for the recipient
      await supabase
        .from("notifications")
        .insert({
          type: "message",
          source_user_id: user.id,
          target_user_id: selectedUser.id,
          message_id: data.id,
          content: messageContent.substring(0, 50) + (messageContent.length > 50 ? "..." : "")
        });
      
      return data as unknown as MessageWithProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUser?.id] });
    },
    onError: () => {
      toast.error("Failed to send message. Please try again.");
    },
  });

  // Handle typing status
  const updateTypingStatus = async (isTyping: boolean) => {
    if (!user || !selectedUser) return;
    
    try {
      const channel = supabase.channel(`typing:${selectedUser.id}-${user.id}`);
      
      if (isTyping) {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: user.id, isTyping: true }
        });
      } else {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: user.id, isTyping: false }
        });
      }
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };
  
  const isUserTyping = (userId: string) => {
    return typingUsers[userId] || false;
  };

  // Set up real-time subscription for new messages and typing status
  useEffect(() => {
    if (!user || !selectedUser) return;

    // Subscribe to new messages
    const messageChannel = supabase
      .channel('new_messages')
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
      
    // Subscribe to typing status
    const typingChannel = supabase.channel(`typing:${user.id}-${selectedUser.id}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload;
        if (userId !== user.id) {
          setTypingUsers(prev => ({ ...prev, [userId]: isTyping }));
          
          // Auto-clear typing status after 3 seconds of inactivity
          if (isTyping) {
            setTimeout(() => {
              setTypingUsers(prev => ({ ...prev, [userId]: false }));
            }, 3000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [user, selectedUser, queryClient]);

  return {
    messages,
    isLoadingMessages,
    sendMessageMutation,
    updateTypingStatus,
    isUserTyping
  };
};
