
import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import StoriesBar from "@/components/stories/StoriesBar";
import PostsList from "@/components/posts/PostsList";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  return (
    <AppLayout>
      <div className={`py-4 ${isMobile ? 'px-1' : 'px-4'}`}>
        <StoriesBar />
        <PostsList />
        
        {!user && (
          <div className="max-w-lg mx-auto mt-8 p-4 text-center bg-muted rounded-md">
            <p className="text-muted-foreground mb-2">
              Sign in to see posts from people you follow and posts you might like
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
