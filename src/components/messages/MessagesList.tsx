
import React, { useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MessageWithProfile } from "@/types/supabase";

interface MessagesListProps {
  messages: MessageWithProfile[];
  isLoading: boolean;
  currentUserId: string;
}

const MessagesList: React.FC<MessagesListProps> = ({ messages, isLoading, currentUserId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {isLoading ? (
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
          const isCurrentUser = message.sender_id === currentUserId;
          
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
  );
};

export default MessagesList;
