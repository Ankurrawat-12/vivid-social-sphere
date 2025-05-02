
import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Search, Edit } from "lucide-react";
import { mockUsers, mockMessages } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { currentUser } from "@/data/mock-data";

const Messages = () => {
  const [selectedUser, setSelectedUser] = React.useState(mockUsers[0]);
  const [messageText, setMessageText] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      // Here you would send the message
      setMessageText("");
    }
  };

  const filteredMessages = mockMessages.filter(
    (message) =>
      (message.senderId === selectedUser.id && message.recipientId === currentUser.id) ||
      (message.senderId === currentUser.id && message.recipientId === selectedUser.id)
  );

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
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {mockUsers.map((user) => {
              const lastMessage = mockMessages.find(
                (m) => m.senderId === user.id || m.recipientId === user.id
              );
              
              return (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted transition-colors",
                    selectedUser.id === user.id && "bg-muted"
                  )}
                  onClick={() => setSelectedUser(user)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.profilePicture} alt={user.username} />
                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate">{user.username}</h3>
                      {lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lastMessage.timestamp), {
                            addSuffix: false,
                          })}
                        </span>
                      )}
                    </div>
                    {lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {lastMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedUser.profilePicture} alt={selectedUser.username} />
                <AvatarFallback>{selectedUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{selectedUser.username}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedUser.isVerified ? "Verified" : "Active now"}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            {filteredMessages.map((message) => {
              const isCurrentUser = message.senderId === currentUser.id;
              
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
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {formatDistanceToNow(new Date(message.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
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
              <Button type="submit" disabled={!messageText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
