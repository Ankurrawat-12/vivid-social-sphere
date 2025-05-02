
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PostCard from "./PostCard";
import { PostWithAuthor } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";

const PostsList = () => {
  const fetchPosts = async (): Promise<PostWithAuthor[]> => {
    // Get posts with author profile, like count, and comment count
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id(*),
        likes_count:likes(count),
        comments_count:comments(count),
        user_has_liked_post:likes!inner(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    return data as unknown as PostWithAuthor[];
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
      {posts.map((post) => (
        <PostCard key={post.id} post={{
          id: post.id,
          userId: post.user_id,
          user: {
            id: post.profiles.id,
            username: post.profiles.username,
            displayName: post.profiles.display_name || post.profiles.username,
            bio: post.profiles.bio || '',
            profilePicture: post.profiles.avatar_url || '',
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
          isLiked: !!post.user_has_liked_post,
          isSaved: false
        }} />
      ))}
    </div>
  );
};

export default PostsList;
