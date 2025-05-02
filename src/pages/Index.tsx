
import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import StoriesBar from "@/components/stories/StoriesBar";
import PostsList from "@/components/posts/PostsList";

const Index = () => {
  return (
    <AppLayout>
      <div className="py-4">
        <StoriesBar />
        <PostsList />
      </div>
    </AppLayout>
  );
};

export default Index;
