
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Profile, MessageWithProfile } from "@/types/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useMessages = (selectedUser: Profile | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
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
          sender_profile:profiles!messages_sender_id_fkey(*),
          recipient_profile:profiles!messages_recipient_id_fkey(*)
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
          sender_profile:profiles!messages_sender_id_fkey(*),
          recipient_profile:profiles!messages_recipient_id_fkey(*)
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

  return {
    messages,
    isLoadingMessages,
    sendMessageMutation
  };
};
