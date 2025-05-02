
import { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Follow = Database['public']['Tables']['follows']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];

export interface PostWithAuthor extends Post {
  profiles: Profile;
  likes_count: number;
  comments_count: number;
  user_has_liked_post: boolean;
}

export interface MessageWithProfile extends Message {
  sender: Profile;
  recipient: Profile;
}
