
import React, { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isSubmitting: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isSubmitting }) => {
  const [messageText, setMessageText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText("");
    }
  };

  return (
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
          disabled={!messageText.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default MessageInput;
