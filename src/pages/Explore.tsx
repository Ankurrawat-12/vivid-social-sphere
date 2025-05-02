
import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Grid, Users } from "lucide-react";
import { mockPosts, mockChannels } from "@/data/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");

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
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Channels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <div className="post-grid">
              {mockPosts.map((post) => (
                <div key={post.id} className="relative pb-[100%]">
                  <img 
                    src={post.imageUrl} 
                    alt={`Post by ${post.user.username}`} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="channels">
            <div className="space-y-4">
              {mockChannels.map((channel) => (
                <div 
                  key={channel.id}
                  className="flex items-center gap-4 p-4 border border-border rounded-md"
                >
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={channel.imageUrl} alt={channel.name} />
                    <AvatarFallback>{channel.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{channel.name}</h3>
                      {channel.isPrivate && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">Private</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{channel.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{channel.members} members</p>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    {channel.isPrivate ? "Request to Join" : "Join"}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Explore;
