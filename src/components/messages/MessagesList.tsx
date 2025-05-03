
import React, { useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageWithProfile } from "@/types/supabase";

interface MessagesListProps {
  messages: MessageWithProfile[];
  isLoading: boolean;
  currentUserId: string;
  isTyping?: boolean;
}

const MessagesList: React.FC<MessagesListProps> = ({ 
  messages, 
  isLoading, 
  currentUserId, 
  isTyping 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const renderMediaContent = (message: MessageWithProfile) => {
    if (!message.media_url) return null;

    switch (message.media_type) {
      case "image":
        return (
          <img 
            src={message.media_url} 
            alt="Image" 
            className="rounded-md max-h-60 max-w-full mb-2" 
          />
        );
      case "video":
        return (
          <video 
            src={message.media_url} 
            controls 
            className="rounded-md max-h-60 max-w-full mb-2" 
          />
        );
      case "audio":
        return (
          <audio 
            src={message.media_url}
            controls
            className="w-full max-w-[200px] mb-2"
          />
        );
      case "file":
        return (
          <a 
            href={message.media_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-blue-500 underline mb-2 block"
          >
            Download attached file
          </a>
        );
      default:
        return null;
    }
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
        <>
          {messages.map((message) => {
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
                  {renderMediaContent(message)}
                  
                  {message.content && (
                    <p className="text-sm break-words">{message.content}</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-1 gap-1">
                    <span className="text-xs opacity-70">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: false,
                      })}
                    </span>
                    
                    {isCurrentUser && (
                      <span className="text-xs">
                        {message.is_read ? (
                          <CheckCheck className="h-3 w-3 inline-block" />
                        ) : (
                          <Check className="h-3 w-3 inline-block" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="mb-4 flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2 rounded-tl-none">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default MessagesList;
