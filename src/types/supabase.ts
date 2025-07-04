// Types for Supabase tables and queries

export interface Profile {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
  is_private?: boolean;
}

export interface ProfileWithCounts extends Profile {
  posts_count: number;
  followers_count: number;
  following_count: number;
  follow_status?: "none" | "pending" | "accepted";
}

export interface Post {
  id: string;
  user_id: string;
  caption?: string | null;
  image_url: string;
  music_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostWithProfile extends Post {
  profile: Profile;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  media_type?: string | null;
  media_url?: string | null;
  created_at: string;
}

export interface MessageWithProfile extends Message {
  sender: Profile;
  recipient: Profile;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;  // Include the user profile for displaying in comments
}

export interface Notification {
  id: string;
  type: string;
  source_user_id: string;
  target_user_id: string;
  post_id?: string | null;
  message_id?: string | null;
  content?: string | null;
  is_read: boolean;
  created_at: string;
  source_user?: Profile;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: "pending" | "accepted";
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
  expires_at: string;
  profile?: Profile;
  viewed_by_user?: boolean;
}

export interface SavedPost {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}
