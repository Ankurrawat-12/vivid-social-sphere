
import { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Follow = Database['public']['Tables']['follows']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Notification = {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention';
  created_at: string;
  is_read: boolean;
  source_user_id: string;
  target_user_id: string;
  post_id?: string;
  message_id?: string;
  content?: string;
  source_user: Profile;
};

export interface PostWithAuthor extends Post {
  profiles: Profile;
  likes_count: number;
  comments_count: number;
  user_has_liked_post: boolean;
}

export interface MessageWithProfile extends Message {
  sender_profile: Profile;
  recipient_profile: Profile;
}
