
import React from "react";

interface PostsEmptyProps {
  message?: string;
}

const PostsEmpty: React.FC<PostsEmptyProps> = ({ 
  message = "No posts yet. Follow users or create your first post!" 
}) => {
  return (
    <div className="max-w-lg mx-auto p-4 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

export default PostsEmpty;
