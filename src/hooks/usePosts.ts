
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostWithProfile } from "@/types/supabase";

// Explicitly define types to avoid deep type instantiation
export interface TransformedPost extends Omit<PostWithProfile, "profile"> {
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

export const usePosts = (userId: string | undefined) => {
  const [seenAllFollowingPosts, setSeenAllFollowingPosts] = useState(false);

  const fetchPosts = async (): Promise<TransformedPost[]> => {
    if (!userId) return [];

    // First fetch users that the current user follows
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    
    if (followsError) {
      console.error('Error fetching follows data:', followsError);
      return [];
    }
    
    const followingIds = followsData?.map(follow => follow.following_id) || [];
    
    // Add the user's own ID to see their posts too
    followingIds.push(userId);
    
    // Get posts from followed users
    if (followingIds.length === 0) {
      setSeenAllFollowingPosts(true);
      return [];
    }
    
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

    if (!data || data.length === 0) {
      setSeenAllFollowingPosts(true);
      // If no posts from following users, return empty array
      return [];
    }

    // Transform counts from array objects to numbers
    const transformedData = data.map(post => ({
      ...post,
      likes_count: parseInt(String(post.likes_count[0]?.count || "0"), 10),
      comments_count: parseInt(String(post.comments_count[0]?.count || "0"), 10)
    }));

    // Check if the user has liked each post
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
      
      return postsWithLikeStatus as TransformedPost[];
    }

    return transformedData.map(post => ({
      ...post,
      user_has_liked: false
    })) as TransformedPost[];
  };

  const fetchRandomSuggestions = async (): Promise<TransformedPost[]> => {
    if (!userId) return [];
    
    try {
      // Get random posts not from followed users and not from the current user
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      const excludeIds = followsData?.map(follow => follow.following_id) || [];
      excludeIds.push(userId);

      // If there are no excludeIds, just get some posts
      const query = supabase
        .from('posts')
        .select(`
          *,
          profile:user_id(*),
          likes_count:likes(count),
          comments_count:comments(count)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
        
      // Only apply the not-in filter if there are IDs to exclude  
      if (excludeIds.length > 0) {
        query.not('user_id', 'in', `(${excludeIds.join(',')})`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) return [];
      
      // Transform counts from array objects to numbers
      const transformedData = data.map(post => ({
        ...post,
        likes_count: parseInt(String(post.likes_count[0]?.count || "0"), 10),
        comments_count: parseInt(String(post.comments_count[0]?.count || "0"), 10)
      }));
      
      // Check if the user has liked each post
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
      
      return postsWithLikeStatus as TransformedPost[];
      
    } catch (error) {
      console.error('Error fetching suggested posts:', error);
      return [];
    }
  };

  const followingPostsQuery = useQuery<TransformedPost[], Error>({
    queryKey: ['following-posts', userId],
    queryFn: fetchPosts,
    enabled: !!userId
  });
  
  const suggestedPostsQuery = useQuery<TransformedPost[], Error>({
    queryKey: ['suggested-posts', userId],
    queryFn: fetchRandomSuggestions,
    enabled: !!userId && (seenAllFollowingPosts || (followingPostsQuery.data?.length || 0) === 0)
  });

  // Check if user has seen all posts from their following
  useEffect(() => {
    if (followingPostsQuery.data?.length === 0 && !followingPostsQuery.isLoading) {
      setSeenAllFollowingPosts(true);
    }
  }, [followingPostsQuery.data, followingPostsQuery.isLoading]);

  // Combine posts - show following posts first, then suggestions if needed
  const posts = followingPostsQuery.data?.length ? followingPostsQuery.data : suggestedPostsQuery.data || [];
  const isLoading = followingPostsQuery.isLoading || (suggestedPostsQuery.isLoading && seenAllFollowingPosts);
  const isError = followingPostsQuery.isError || (suggestedPostsQuery.isError && seenAllFollowingPosts);
  const error = followingPostsQuery.error;

  return {
    posts,
    isLoading,
    isError,
    error,
    seenAllFollowingPosts,
    hasFollowingPosts: (followingPostsQuery.data?.length || 0) > 0,
    hasSuggestedPosts: (suggestedPostsQuery.data?.length || 0) > 0
  };
};
