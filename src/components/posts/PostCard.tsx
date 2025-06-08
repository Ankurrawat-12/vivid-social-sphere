
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Send, Bookmark, Music, Play, Pause } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Post } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import CommentSection from "./CommentSection";
import SharePostModal from "./SharePostModal";
import PostActions from "./PostActions";

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  const [liked, setLiked] = useState(post.isLiked);
  const [saved, setSaved] = useState(post.isSaved);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicInfo, setMusicInfo] = useState<{ title?: string; artist?: string } | null>(null);
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch music info if post has music
  useEffect(() => {
    if (post.musicUrl) {
      const fetchMusicInfo = async () => {
        try {
          const { data, error } = await supabase
            .from("music_library")
            .select("title, artist")
            .eq("file_url", post.musicUrl)
            .single();
          
          if (!error && data) {
            setMusicInfo(data);
          }
        } catch (error) {
          console.error("Error fetching music info:", error);
        }
      };
      
      fetchMusicInfo();
    }
  }, [post.musicUrl]);

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
      
      // Create notification for post owner if the liker is not the post owner
      if (user.id !== post.userId) {
        await supabase
          .from('notifications')
          .insert({
            type: 'like',
            source_user_id: user.id,
            target_user_id: post.userId,
            post_id: post.id
          });
      }
      
      setLikesCount(likesCount + 1);
      setLiked(true);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (saved) {
      // Remove from saved
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to remove from saved');
        console.error('Error removing saved post:', error);
        return;
      }
      
      setSaved(false);
      toast.success('Post removed from saved items');
    } else {
      // Add to saved
      const { error } = await supabase
        .from('saved_posts')
        .insert({
          post_id: post.id,
          user_id: user.id
        });

      if (error) {
        toast.error('Failed to save post');
        console.error('Error saving post:', error);
        return;
      }
      
      setSaved(true);
      toast.success('Post saved to your profile');
    }
  };

  const handleCommentClick = () => {
    setShowComments(!showComments);
  };

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <>
      <div className="bg-background border border-border rounded-md mb-6 animate-fade-in">
        {/* Post Header */}
        <div className="flex items-center justify-between p-3">
          <Link to={`/profile/${post.user.username}`} className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.user.profilePicture} alt={post.user.username} />
              <AvatarFallback>{post.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {post.user.username}
                  {post.user.isVerified && (
                    <span className="inline-block ml-1 text-social-purple">✓</span>
                  )}
                </span>
                {musicInfo && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    <Music className="h-3 w-3" />
                    <span>{musicInfo.title} - {musicInfo.artist}</span>
                    {post.musicUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={toggleMusic}
                      >
                        {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Link>
          <PostActions postId={post.id} userId={post.userId} imageUrl={post.imageUrl} />
        </div>

        {/* Hidden audio element for music */}
        {post.musicUrl && (
          <audio
            ref={audioRef}
            src={post.musicUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        )}

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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCommentClick}>
                <MessageSquare className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShareClick}>
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
            <button 
              onClick={handleCommentClick}
              className="text-sm text-social-text-secondary hover:text-social-text-primary"
            >
              View all {post.comments} comments
            </button>
          )}

          {/* Timestamp */}
          <div className="text-xs text-social-text-secondary mt-2">
            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
          </div>
        </div>
        
        {/* Comments Section (Expanded) */}
        {showComments && (
          <CommentSection 
            postId={post.id} 
            isOpen={showComments} 
            onClose={() => setShowComments(false)} 
          />
        )}
      </div>
      
      {/* Share modal */}
      <SharePostModal 
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        postId={post.id}
        postImageUrl={post.imageUrl}
      />
    </>
  );
};

export default PostCard;
