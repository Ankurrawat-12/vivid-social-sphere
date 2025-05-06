import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PostCard from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Post } from "@/types";

// Define a simpler interface just for the component
interface PostWithDetails {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

const PostsList = () => {
  const { user } = useAuth();

  const fetchPosts = async (): Promise<PostWithDetails[]> => {
    if (!user) return [];

    // First fetch users that the current user follows
    const { data: followsData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted');
    
    const followingIds = followsData?.map(follow => follow.following_id) || [];
    
    // Add the user's own ID to see their posts too
    followingIds.push(user.id);
    
    // Get posts from followed users
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profile:user_id(*),
        likes_count:likes(count),
        comments_count:comments(count)
      `)
      .in('user_id', followingIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    // Transform counts from array objects to numbers
    const transformedData = data.map(post => ({
      ...post,
      likes_count: parseInt(String(post.likes_count[0]?.count || "0"), 10),
      comments_count: parseInt(String(post.comments_count[0]?.count || "0"), 10)
    }));

    // Check if the user has liked each post
    if (user.id) {
      const postsWithLikeStatus = await Promise.all(
        transformedData.map(async (post) => {
          const { data: likeData } = await supabase
            .from('likes')
            .select('*')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();
          
          return {
            ...post,
            user_has_liked: !!likeData
          };
        })
      );
      
      return postsWithLikeStatus;
    }

    return transformedData.map(post => ({
      ...post,
      user_has_liked: false
    }));
  };

  const { data: posts, isLoading, isError, error } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn: fetchPosts,
    enabled: !!user
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
