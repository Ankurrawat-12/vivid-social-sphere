
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PostCard from "./PostCard";
import { PostWithProfile } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";

const PostsList = () => {
  const fetchPosts = async (): Promise<PostWithProfile[]> => {
    // Get posts with author profile, like count, and comment count
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profile:user_id(*),
        likes_count:likes(count),
        comments_count:comments(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    // Transform counts from array objects to numbers
    const transformedData = data.map(post => ({
      ...post,
      likes_count: parseInt(post.likes_count[0]?.count || "0", 10),
      comments_count: parseInt(post.comments_count[0]?.count || "0", 10)
    }));

    // Check if the user has liked each post
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    if (userId) {
      const postsWithLikeStatus = await Promise.all(
        transformedData.map(async (post) => {
          const { data: likeData } = await supabase
            .from('likes')
            .select('*')
            .eq('post_id', post.id)
            .eq('user_id', userId)
            .single();
          
          return {
            ...post,
            user_has_liked: !!likeData
          };
        })
      );
      
      return postsWithLikeStatus as unknown as PostWithProfile[];
    }

    return transformedData.map(post => ({
      ...post,
      user_has_liked: false
    })) as unknown as PostWithProfile[];
  };

  const { data: posts, isLoading, isError, error } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts
  });

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        {[1, 2, 3].map((index) => (
          <div key={index} className="border border-border rounded-md">
            <div className="p-3 flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-96 w-full" />
            <div className="p-3 space-y-2">
              <div className="flex gap-4">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="max-w-lg mx-auto p-4 text-red-500">Error loading posts: {String(error)}</div>;
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center">
        <p className="text-muted-foreground">No posts yet. Follow users or create your first post!</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {posts?.map((post) => (
        <PostCard key={post.id} post={{
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
          isSaved: false
        }} />
      ))}
    </div>
  );
};

export default PostsList;
