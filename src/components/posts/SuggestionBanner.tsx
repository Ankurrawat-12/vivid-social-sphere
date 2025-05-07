
import React from "react";

const SuggestionBanner: React.FC = () => {
  return (
    <div className="mb-4 p-4 bg-muted/30 rounded-lg text-center">
      <p className="text-sm font-medium">You've seen all posts from people you follow</p>
      <p className="text-xs text-muted-foreground">Here are some posts you might like</p>
    </div>
  );
};

export default SuggestionBanner;
