
import { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Like = Database["public"]["Tables"]["likes"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"] & {
  media_url?: string;
  media_type?: string;
};
export type Notification = Database["public"]["Tables"]["notifications"]["Row"] & {
  source_user: Profile;
};

export type PostWithProfile = Post & {
  profile: Profile;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
};

export type CommentWithProfile = Comment & {
  profile: Profile;
};

export type MessageWithProfile = Message & {
  sender: Profile;
  recipient: Profile;
};
