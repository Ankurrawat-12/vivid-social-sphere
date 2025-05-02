
import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Grid, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPosts = async () => {
    let query = supabase
      .from('posts')
      .select('*');
      
    if (searchQuery) {
      query = query.ilike('caption', `%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
    
    return data;
  };

  const fetchProfiles = async () => {
    let query = supabase
      .from('profiles')
      .select('*');
      
    if (searchQuery) {
      query = query.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('username', { ascending: true });
    
    if (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }
    
    return data;
  };

  const { 
    data: posts, 
    isLoading: isLoadingPosts,
    isError: isErrorPosts,
    error: postsError
  } = useQuery({
    queryKey: ['explore-posts', searchQuery],
    queryFn: fetchPosts
  });

  const { 
    data: profiles, 
    isLoading: isLoadingProfiles,
    isError: isErrorProfiles,
    error: profilesError
  } = useQuery({
    queryKey: ['explore-profiles', searchQuery],
    queryFn: fetchProfiles
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Tabs defaultValue="posts">
          <TabsList className="mb-6">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Profiles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {isLoadingPosts ? (
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-square w-full" />
                ))}
              </div>
            ) : isErrorPosts ? (
              <div className="p-4 text-red-500">Error loading posts: {String(postsError)}</div>
            ) : !posts || posts.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No posts found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <div key={post.id} className="relative pb-[100%]">
                    <img 
                      src={post.image_url} 
                      alt={`Post ${post.id}`} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profiles">
            {isLoadingProfiles ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-md">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isErrorProfiles ? (
              <div className="p-4 text-red-500">Error loading profiles: {String(profilesError)}</div>
            ) : !profiles || profiles.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No profiles found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div 
                    key={profile.id}
                    className="flex items-center gap-4 p-4 border border-border rounded-md"
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile.avatar_url} alt={profile.username} />
                      <AvatarFallback>{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <h3 className="font-medium">{profile.display_name || profile.username}</h3>
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                      {profile.bio && (
                        <p className="text-sm mt-1">{profile.bio}</p>
                      )}
                    </div>
                    
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/profile/${profile.username}`}>View Profile</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Explore;
