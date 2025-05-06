
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types/supabase";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const [showChat, setShowChat] = useState(false);

  // Get profiles data
  const { profiles, isLoadingProfiles } = useContacts();
  
  // Initialize user from navigation state if available
  useEffect(() => {
    if (location.state?.selectedUser) {
      setSelectedUser(location.state.selectedUser);
      if (isMobile) {
        setShowChat(true);
      }
    }
  }, [location.state, isMobile]);

  // Get messages data and message-related operations
  const { 
    messages, 
    isLoadingMessages, 
    sendMessageMutation,
    updateTypingStatus,
    isUserTyping
  } = useMessages(selectedUser);

  // Handle user selection from contacts
  const handleUserSelect = (profile: Profile) => {
    setSelectedUser(profile);
    if (isMobile) {
      setShowChat(true);
    }
    
    // Update URL without page reload
    navigate('/messages', { 
      state: { selectedUser: profile },
      replace: true 
    });
  };

  // Handle back button for mobile view
  const handleBackToList = () => {
    if (isMobile) {
      setShowChat(false);
    }
  };

  // Handle input change for typing indicator
  const handleInputChange = () => {
    if (!selectedUser) return;
    
    updateTypingStatus(true);
    
    // Clear existing timer
    if (typingTimer) {
      clearTimeout(typingTimer);
    }
    
    // Set a new timer to stop typing status after 2 seconds of inactivity
    const timer = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
    
    setTypingTimer(timer);
  };

  // Handle send message
  const handleSendMessage = (messageText: string, file?: File) => {
    sendMessageMutation.mutate({ messageContent: messageText, file });
    
    // Clear typing status when message is sent
    updateTypingStatus(false);
    if (typingTimer) {
      clearTimeout(typingTimer);
      setTypingTimer(null);
    }
  };

  // Clean up typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
    };
  }, [typingTimer]);

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
          isMobile={isMobile}
          showInMobile={!showChat || !isMobile}
        />

        {/* Chat */}
        <div className={`flex-1 flex flex-col ${isMobile && !showChat ? 'hidden' : 'flex'}`}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <ChatHeader 
                user={selectedUser} 
                isOnline={Math.random() > 0.5} // Mock online status - in a real app, you'd use presence
                onBackClick={isMobile ? handleBackToList : undefined}
              />

              {/* Messages List */}
              <MessagesList 
                messages={messages} 
                isLoading={isLoadingMessages} 
                currentUserId={user?.id || ''}
                isTyping={selectedUser ? isUserTyping(selectedUser.id) : false}
              />

              {/* Message Input */}
              <MessageInput 
                onSendMessage={handleSendMessage}
                isSubmitting={sendMessageMutation.isPending}
                onInputChange={handleInputChange}
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
