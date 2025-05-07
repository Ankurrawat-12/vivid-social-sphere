
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MessageSquare, Image as ImageIcon, Lock } from "lucide-react";
import { PostWithProfile, ProfileWithCounts } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PostCard from "@/components/posts/PostCard";
import { Post } from "@/types";

interface UserPostsGridProps {
  userId: string;
  profile?: ProfileWithCounts;
}

const UserPostsGrid = ({ userId, profile }: UserPostsGridProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  
  // Check if this is a private profile and the user doesn't have access
  const isPrivateAndNotAccessible = profile?.is_private && 
    profile?.follow_status !== 'accepted' && 
    user?.id !== userId;

  const { data: posts, isLoading } = useQuery({
    queryKey: ["userPosts", userId, profile?.is_private],
    queryFn: async () => {
      // Don't fetch posts if this is a private profile and user doesn't have access
      if (isPrivateAndNotAccessible) return [];

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profile:user_id (*),
          likes_count:likes(count),
          comments_count:comments(count),
          user_has_liked:likes!inner(id).filter(user_id.eq.${user?.id || null})
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      return data as PostWithProfile[];
    },
    enabled: !!userId && !isPrivateAndNotAccessible
  });

  const handlePostClick = (post: PostWithProfile) => {
    // Transform post data to match Post type expected by PostCard
    const transformedPost: Post = {
      id: post.id,
      userId: post.user_id,
      user: {
        id: post.profile.id,
        username: post.profile.username,
        displayName: post.profile.display_name || post.profile.username,
        bio: post.profile.bio || '',
        profilePicture: post.profile.avatar_url || '',
        followers: 0,
        following: 0,
        posts: 0,
        isVerified: false
      },
      imageUrl: post.image_url,
      caption: post.caption || '',
      likes: post.likes_count,
      comments: post.comments_count,
      timestamp: post.created_at,
      isLiked: post.user_has_liked && post.user_has_liked.length > 0,
      isSaved: false
    };

    setSelectedPost(transformedPost);
    setIsPostModalOpen(true);
  };

  if (isLoading) {
    const gridCols = isMobile ? "grid-cols-3" : "grid-cols-3";
    
    return (
      <div className={`grid ${gridCols} gap-1 md:gap-4`}>
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (isPrivateAndNotAccessible) {
    return (
      <div className="h-60 flex flex-col items-center justify-center text-social-text-secondary space-y-4">
        <Lock className="h-12 w-12 opacity-50" />
        <p className="text-center">This account is private</p>
        <p className="text-center text-sm">Follow this account to see their posts</p>
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <div className="h-40 flex items-center justify-center text-social-text-secondary">
        No posts yet
      </div>
    );
  }

  const gridCols = isMobile ? "grid-cols-3" : "grid-cols-3";

  return (
    <>
      <div className={`grid ${gridCols} gap-1 md:gap-4`}>
        {posts.map((post) => (
          <div 
            key={post.id} 
            className="relative cursor-pointer group"
            onClick={() => handlePostClick(post)}
          >
            <AspectRatio ratio={1}>
              <img 
                src={post.image_url} 
                alt={post.caption || "Post"} 
                className="object-cover w-full h-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
            </AspectRatio>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <div className="text-white flex items-center">
                {post.caption ? (
                  <MessageSquare className="h-5 w-5 mr-1" />
                ) : (
                  <ImageIcon className="h-5 w-5 mr-1" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Post Modal */}
      {selectedPost && (
        <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
          <DialogContent className="sm:max-w-lg p-0">
            <PostCard post={selectedPost} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default UserPostsGrid;
