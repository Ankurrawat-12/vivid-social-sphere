
import React from "react";
import PostCard from "./PostCard";
import { mockPosts } from "@/data/mock-data";

const PostsList = () => {
  return (
    <div className="max-w-lg mx-auto">
      {mockPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

export default PostsList;
