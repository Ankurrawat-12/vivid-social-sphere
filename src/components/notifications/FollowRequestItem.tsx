
import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface FollowRequest {
  id: string;
  follower_id: string;
  following_id: string;
  status: "pending" | "accepted";
  created_at: string;
  follower: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FollowRequestItemProps {
  request: FollowRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isHandling: boolean;
}

const FollowRequestItem: React.FC<FollowRequestItemProps> = ({
  request,
  onAccept,
  onReject,
  isHandling
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={request.follower.avatar_url || ''}
              alt={request.follower.username}
            />
            <AvatarFallback>
              {request.follower.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              @{request.follower.username} wants to follow you
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onAccept(request.id)}
              disabled={isHandling}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(request.id)}
              disabled={isHandling}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FollowRequestItem;
