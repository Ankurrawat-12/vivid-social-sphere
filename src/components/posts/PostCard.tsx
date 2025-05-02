
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Post } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  const [liked, setLiked] = useState(post.isLiked);
  const [saved, setSaved] = useState(post.isSaved);
  const [likesCount, setLikesCount] = useState(post.likes);
  const { user } = useAuth();

  const handleLike = async () => {
    if (!user) return;

    if (liked) {
      // Unlike post
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to unlike post');
        console.error('Error unliking post:', error);
        return;
      }
      
      setLikesCount(likesCount - 1);
      setLiked(false);
    } else {
      // Like post
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: post.id,
          user_id: user.id
        });

      if (error) {
        toast.error('Failed to like post');
        console.error('Error liking post:', error);
        return;
      }
      
      setLikesCount(likesCount + 1);
      setLiked(true);
    }
  };

  const handleSave = () => {
    setSaved(!saved);
  };

  return (
    <div className="bg-background border border-border rounded-md mb-6 animate-fade-in">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <Link to={`/profile/${post.user.username}`} className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={post.user.profilePicture} alt={post.user.username} />
            <AvatarFallback>{post.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {post.user.username}
              {post.user.isVerified && (
                <span className="inline-block ml-1 text-social-purple">✓</span>
              )}
            </span>
          </div>
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {/* Post Image */}
      <div className="relative pb-[100%]">
        <img
          src={post.imageUrl}
          alt={`Post by ${post.user.username}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Post Actions */}
      <div className="p-3">
        <div className="flex justify-between mb-2">
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleLike}
            >
              <Heart 
                className={cn("h-6 w-6", liked && "fill-red-500 text-red-500")} 
              />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MessageSquare className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Send className="h-6 w-6" />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={handleSave}
          >
            <Bookmark 
              className={cn("h-6 w-6", saved && "fill-social-purple text-social-purple")} 
            />
          </Button>
        </div>

        {/* Likes */}
        <div className="font-medium text-sm mb-1">{likesCount.toLocaleString()} likes</div>

        {/* Caption */}
        <div className="text-sm mb-1">
          <Link to={`/profile/${post.user.username}`} className="font-medium">
            {post.user.username}
          </Link>{" "}
          {post.caption}
        </div>

        {/* Comments link */}
        {post.comments > 0 && (
          <Link to={`/post/${post.id}`} className="text-sm text-social-text-secondary">
            View all {post.comments} comments
          </Link>
        )}

        {/* Timestamp */}
        <div className="text-xs text-social-text-secondary mt-2">
          {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
};

export default PostCard;
