
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Heart, Reply } from 'lucide-react';

interface CommentSectionProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const queryClient = useQueryClient();

  // Fetch comments for post
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profile:user_id(*)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content
        })
        .select(`
          *,
          profile:user_id(*)
        `)
        .single();
        
      if (error) throw error;
      
      // Fetch post owner to send notification
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
        
      if (postData && postData.user_id !== user.id) {
        // Add notification for post owner
        await supabase
          .from('notifications')
          .insert({
            type: 'comment',
            source_user_id: user.id,
            target_user_id: postData.user_id,
            post_id: postId,
            content: content.substring(0, 50)
          });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setComment('');
      setReplyingTo(null);
      setReplyContent('');
    }
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addCommentMutation.mutate(comment.trim());
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo(commentId);
    setReplyContent(`@${username} `);
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    addCommentMutation.mutate(replyContent.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        
        {/* Comments list - scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={comment.profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {comment.profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <p className="text-sm font-medium">{comment.profile?.username}</p>
                        <p className="text-sm break-words">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleReply(comment.id, comment.profile?.username || '')}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-red-500"
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          Like
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Comment input - fixed at bottom */}
        <div className="space-y-2">
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md">
              <span className="text-sm text-muted-foreground">Replying to comment</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
          
          <form onSubmit={replyingTo ? handleSubmitReply : handleSubmitComment} className="flex gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback>{profile?.username?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <Input
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              value={replyingTo ? replyContent : comment}
              onChange={(e) => replyingTo ? setReplyContent(e.target.value) : setComment(e.target.value)}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={(!comment.trim() && !replyContent.trim()) || addCommentMutation.isPending}
              size="sm"
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Post'
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentSection;
