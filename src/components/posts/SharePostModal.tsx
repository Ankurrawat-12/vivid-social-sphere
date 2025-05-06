
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types/supabase';
import { toast } from 'sonner';

interface SharePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postImageUrl: string;
}

const SharePostModal: React.FC<SharePostModalProps> = ({
  open,
  onOpenChange,
  postId,
  postImageUrl
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [message, setMessage] = useState('Check out this post!');

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!user) return [];
      
      // Get users that current user follows or who follow current user
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id, follower_id')
        .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);
        
      if (followsError) throw followsError;
      
      // Extract unique user IDs
      const userIds = new Set<string>();
      follows.forEach(follow => {
        if (follow.follower_id === user.id) {
          userIds.add(follow.following_id);
        } else {
          userIds.add(follow.follower_id);
        }
      });
      
      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(userIds));
        
      if (profilesError) throw profilesError;
      
      return profiles;
    },
    enabled: !!user && open
  });

  // Share post mutation
  const sharePostMutation = useMutation({
    mutationFn: async () => {
      if (!user || selectedUsers.length === 0) return;
      
      // Send a message to each selected user
      await Promise.all(selectedUsers.map(async (recipient) => {
        // Create message
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: recipient.id,
            content: message,
            media_url: postImageUrl,
            media_type: 'post_share',
          })
          .select()
          .single();
          
        if (messageError) throw messageError;
        
        // Create notification
        await supabase
          .from('notifications')
          .insert({
            type: 'message',
            source_user_id: user.id,
            target_user_id: recipient.id,
            message_id: messageData.id,
            post_id: postId,
            content: 'shared a post with you'
          });
      }));
      
      return true;
    },
    onSuccess: () => {
      toast.success(`Post shared with ${selectedUsers.length} ${selectedUsers.length === 1 ? 'person' : 'people'}`);
      setSelectedUsers([]);
      setMessage('Check out this post!');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error sharing post:', error);
      toast.error('Failed to share post. Please try again.');
    }
  });

  const filteredContacts = contacts.filter(contact => {
    return (
      contact.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleSelectUser = (profile: Profile) => {
    if (selectedUsers.some(u => u.id === profile.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== profile.id));
    } else {
      setSelectedUsers([...selectedUsers, profile]);
    }
  };

  const handleShare = () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one person to share with');
      return;
    }
    
    sharePostMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="max-h-[250px]">
              <div className="space-y-2">
                {filteredContacts.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No contacts found</p>
                ) : (
                  filteredContacts.map(profile => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => toggleSelectUser(profile)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={profile.avatar_url || ''} />
                          <AvatarFallback>
                            {profile.username?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{profile.display_name || profile.username}</p>
                          <p className="text-xs text-muted-foreground">@{profile.username}</p>
                        </div>
                      </div>
                      <div className="h-5 w-5 rounded-full border border-primary flex items-center justify-center">
                        {selectedUsers.some(u => u.id === profile.id) && (
                          <div className="h-3 w-3 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
          
          {selectedUsers.length > 0 && (
            <>
              <div className="py-2">
                <h4 className="text-sm font-medium mb-2">Message</h4>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {selectedUsers.slice(0, 3).map(user => (
                    <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback>
                        {user.username?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {selectedUsers.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                      +{selectedUsers.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  Sharing with {selectedUsers.length} {selectedUsers.length === 1 ? 'person' : 'people'}
                </span>
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={selectedUsers.length === 0 || sharePostMutation.isPending}
            >
              {sharePostMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing
                </>
              ) : (
                'Share'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SharePostModal;
