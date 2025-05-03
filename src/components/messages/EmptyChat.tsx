
import React from "react";
import { Send } from "lucide-react";

const EmptyChat: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground">
      <div className="mb-4">
        <Send className="h-12 w-12" />
      </div>
      <h3 className="text-xl font-medium mb-2">Your Messages</h3>
      <p className="text-center max-w-xs">
        Send private messages to other users on VividSocial
      </p>
    </div>
  );
};

export default EmptyChat;
