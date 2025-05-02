
import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid, Bookmark, Film, User as UserIcon, Settings } from "lucide-react";
import { currentUser, mockPosts } from "@/data/mock-data";

const Profile = () => {
  const [isFollowing, setIsFollowing] = useState(false);
  const user = currentUser;

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
          <Avatar className="h-24 w-24 md:h-32 md:w-32">
            <AvatarImage src={user.profilePicture} alt={user.username} />
            <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-4">
              <h1 className="text-xl font-medium flex items-center">
                {user.username}
                {user.isVerified && (
                  <span className="inline-block ml-1 text-social-purple">✓</span>
                )}
              </h1>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleFollowToggle}>
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                <Button variant="outline">Message</Button>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex justify-center md:justify-start gap-6 mb-4">
              <div className="text-center">
                <span className="font-medium">{user.posts}</span>{" "}
                <span className="text-social-text-secondary">posts</span>
              </div>
              <div className="text-center">
                <span className="font-medium">{user.followers}</span>{" "}
                <span className="text-social-text-secondary">followers</span>
              </div>
              <div className="text-center">
                <span className="font-medium">{user.following}</span>{" "}
                <span className="text-social-text-secondary">following</span>
              </div>
            </div>

            <div>
              <h2 className="font-medium">{user.displayName}</h2>
              <p className="text-sm whitespace-pre-line">{user.bio}</p>
            </div>
          </div>
        </div>

        {/* Profile Content Tabs */}
        <Tabs defaultValue="posts">
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1">
              <Grid className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex-1">
              <Bookmark className="h-4 w-4 mr-2" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex-1">
              <Film className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="tagged" className="flex-1">
              <UserIcon className="h-4 w-4 mr-2" />
              Tagged
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-6">
            <div className="post-grid">
              {mockPosts.map((post) => (
                <div key={post.id} className="relative pb-[100%]">
                  <img 
                    src={post.imageUrl} 
                    alt={`Post ${post.id}`} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="saved" className="mt-6">
            <div className="post-grid">
              {mockPosts
                .filter(post => post.isSaved)
                .map((post) => (
                  <div key={post.id} className="relative pb-[100%]">
                    <img 
                      src={post.imageUrl} 
                      alt={`Post ${post.id}`} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                ))}
            </div>
          </TabsContent>
          
          <TabsContent value="videos">
            <div className="h-40 flex items-center justify-center text-social-text-secondary">
              No videos yet
            </div>
          </TabsContent>
          
          <TabsContent value="tagged">
            <div className="h-40 flex items-center justify-center text-social-text-secondary">
              No tagged posts
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;
