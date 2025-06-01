
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MessageSquare, Image as ImageIcon, Lock, Bookmark } from "lucide-react";
import { PostWithProfile, ProfileWithCounts } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PostCard from "@/components/posts/PostCard";
import { Post } from "@/types";
import { toast } from "sonner";

interface SavedPostsGridProps {
  userId: string;
  profile?: ProfileWithCounts;
}

const SavedPostsGrid = ({ userId, profile }: SavedPostsGridProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  
  // Only show saved posts if this is the current user's profile
  const isOwnProfile = user?.id === userId;

  const { data: savedPosts, isLoading } = useQuery({
    queryKey: ["savedPosts", userId],
    queryFn: async () => {
      if (!isOwnProfile) return [];

      const { data, error } = await supabase
        .from("saved_posts")
        .select(`
          *,
          post:post_id (
            *,
            profile:user_id (*),
            likes_count:likes(count),
            comments_count:comments(count)
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;

      // Transform the data to match the expected type structure
      const transformedData = (data || []).map(savedPost => {
        const post = savedPost.post;
        return {
          ...post,
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          user_has_liked: false // We'll check this separately if needed
        };
      });

      // Check if the current user has liked each post
      if (user) {
        const postsWithLikeStatus = await Promise.all(
          transformedData.map(async (post) => {
            const { data: likeData } = await supabase
              .from("likes")
              .select("id")
              .eq("post_id", post.id)
              .eq("user_id", user.id)
              .single();
            
            return {
              ...post,
              user_has_liked: !!likeData
            };
          })
        );
        
        return postsWithLikeStatus as PostWithProfile[];
      }
      
      return transformedData as PostWithProfile[];
    },
    enabled: !!userId && isOwnProfile
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
      isLiked: post.user_has_liked,
      isSaved: true // Since these are saved posts
    };

    setSelectedPost(transformedPost);
    setIsPostModalOpen(true);
  };

  if (!isOwnProfile) {
    return (
      <div className="h-60 flex flex-col items-center justify-center text-social-text-secondary space-y-4">
        <Lock className="h-12 w-12 opacity-50" />
        <p className="text-center">Only you can see your saved posts</p>
      </div>
    );
  }

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

  if (!savedPosts || savedPosts.length === 0) {
    return (
      <div className="h-60 flex flex-col items-center justify-center text-social-text-secondary space-y-4">
        <Bookmark className="h-12 w-12 opacity-50" />
        <p className="text-center">No saved posts yet</p>
        <p className="text-center text-sm">Save posts you want to see again</p>
      </div>
    );
  }

  const gridCols = isMobile ? "grid-cols-3" : "grid-cols-3";

  return (
    <>
      <div className={`grid ${gridCols} gap-1 md:gap-4`}>
        {savedPosts.map((post) => (
          <div 
            key={post.id} 
            className="relative cursor-pointer group"
            onClick={() => handlePostClick(post)}
          >
            <AspectRatio ratio={1}>
              <img 
                src={post.image_url} 
                alt={post.caption || "Saved post"} 
                className="object-cover w-full h-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
            </AspectRatio>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <div className="text-white flex items-center">
                <Bookmark className="h-5 w-5 mr-1 fill-current" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Post Modal */}
      <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
        <DialogContent className="sm:max-w-lg p-0">
          {selectedPost && <PostCard post={selectedPost} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedPostsGrid;
