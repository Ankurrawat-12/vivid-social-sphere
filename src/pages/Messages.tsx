
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types/supabase";

// Import custom hooks and components
import { useContacts } from "@/hooks/useContacts";
import { useMessages } from "@/hooks/useMessages";
import ContactList from "@/components/messages/ContactList";
import ChatHeader from "@/components/messages/ChatHeader";
import MessagesList from "@/components/messages/MessagesList";
import MessageInput from "@/components/messages/MessageInput";
import EmptyChat from "@/components/messages/EmptyChat";

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Get contacts data
  const { profiles, isLoadingProfiles } = useContacts();

  // Get messages data and message-related operations
  const { 
    messages, 
    isLoadingMessages, 
    sendMessageMutation 
  } = useMessages(selectedUser);

  // Handle user selection from contacts
  const handleUserSelect = (profile: Profile) => {
    setSelectedUser(profile);
  };

  // Handle send message
  const handleSendMessage = (messageText: string) => {
    sendMessageMutation.mutate(messageText);
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-130px)] mt-4 flex border border-border rounded-md overflow-hidden">
        {/* Sidebar - Contact List */}
        <ContactList 
          profiles={profiles}
          selectedUser={selectedUser}
          messages={messages}
          isLoadingProfiles={isLoadingProfiles}
          onSelectUser={handleUserSelect}
          currentUserId={user?.id || ''}
        />

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <ChatHeader user={selectedUser} />

              {/* Messages List */}
              <MessagesList 
                messages={messages} 
                isLoading={isLoadingMessages} 
                currentUserId={user?.id || ''}
              />

              {/* Message Input */}
              <MessageInput 
                onSendMessage={handleSendMessage}
                isSubmitting={sendMessageMutation.isPending}
              />
            </>
          ) : (
            <EmptyChat />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
