
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MessageSquare, Image as ImageIcon, Bookmark } from "lucide-react";
import { PostWithProfile } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PostCard from "@/components/posts/PostCard";
import { Post } from "@/types";

interface SavedPostsGridProps {
  userId: string;
  profile?: any;
}

const SavedPostsGrid = ({ userId }: SavedPostsGridProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  const { data: savedPosts, isLoading } = useQuery({
    queryKey: ["savedPosts", userId],
    queryFn: async () => {
      if (!user || user.id !== userId) return [];

      const { data, error } = await supabase
        .from("saved_posts")
        .select(`
          post_id,
          posts!inner(
            *,
            profiles!inner(*)
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;

      // Transform the data to match the expected type structure
      const transformedData = (data || []).map(savedPost => {
        const post = savedPost.posts;
        return {
          ...post,
          profile: post.profiles,
          likes_count: 0,
          comments_count: 0,
          user_has_liked: false
        };
      });

      // Get like counts and user like status for each post
      const postsWithCounts = await Promise.all(
        transformedData.map(async (post) => {
          const [likesResult, commentsResult, userLikeResult] = await Promise.all([
            supabase.from("likes").select("id", { count: "exact" }).eq("post_id", post.id),
            supabase.from("comments").select("id", { count: "exact" }).eq("post_id", post.id),
            user ? supabase.from("likes").select("id").eq("post_id", post.id).eq("user_id", user.id).single() : { data: null }
          ]);
          
          return {
            ...post,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
            user_has_liked: !!userLikeResult.data
          };
        })
      );
      
      return postsWithCounts as PostWithProfile[];
    },
    enabled: !!user && user.id === userId
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
      isSaved: true, // Always true for saved posts
      musicUrl: post.music_url
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

  if (!savedPosts || savedPosts.length === 0) {
    return (
      <div className="h-60 flex flex-col items-center justify-center text-social-text-secondary space-y-4">
        <Bookmark className="h-12 w-12 opacity-50" />
        <p className="text-center">No saved posts yet</p>
        <p className="text-center text-sm">Save posts to view them here</p>
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
                <Bookmark className="h-5 w-5 mr-1 fill-white" />
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
