
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "./PostCard";
import PostsLoading from "./PostsLoading";
import PostsEmpty from "./PostsEmpty";
import SuggestionBanner from "./SuggestionBanner";
import { usePosts } from "@/hooks/usePosts";

const PostsList = () => {
  const { user } = useAuth();
  const { 
    posts, 
    isLoading, 
    isError, 
    error, 
    seenAllFollowingPosts, 
    hasSuggestedPosts 
  } = usePosts(user?.id);
  
  if (isLoading) {
    return <PostsLoading />;
  }

  if (isError) {
    return <div className="max-w-lg mx-auto p-4 text-red-500">Error loading posts: {String(error)}</div>;
  }

  if (!posts || posts.length === 0) {
    return <PostsEmpty />;
  }

  return (
    <div className="max-w-lg mx-auto">
      {seenAllFollowingPosts && hasSuggestedPosts && <SuggestionBanner />}
      
      {posts.map((post) => (
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
