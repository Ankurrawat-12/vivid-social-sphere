
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const Archive = () => {
  const { user } = useAuth();

  // Fetch user's posts
  const { data: posts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ["userPosts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user posts:", error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });

  // Fetch user's stories (including expired ones)
  const { data: stories = [], isLoading: isLoadingStories } = useQuery({
    queryKey: ["userStories", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user stories:", error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Archive</h1>
        
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-6">
            {isLoadingPosts ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-social-purple"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No posts in archive</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <Card key={post.id} className="overflow-hidden">
                    <div className="aspect-square relative">
                      <img
                        src={post.image_url}
                        alt="Archived post"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                      {post.caption && (
                        <p className="text-sm line-clamp-2">{post.caption}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="stories" className="mt-6">
            {isLoadingStories ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-social-purple"></div>
              </div>
            ) : stories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No stories in archive</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stories.map((story) => (
                  <Card key={story.id} className="overflow-hidden">
                    <div className="aspect-[9/16] relative">
                      {story.media_type === "image" ? (
                        <img
                          src={story.media_url}
                          alt="Archived story"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={story.media_url}
                          className="w-full h-full object-cover"
                          controls={false}
                        />
                      )}
                      <div className="absolute top-2 right-2">
                        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                          {story.media_type}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expired: {formatDistanceToNow(new Date(story.expires_at), { addSuffix: true })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Archive;
