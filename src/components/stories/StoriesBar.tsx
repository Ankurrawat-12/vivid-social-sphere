
import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StoryCircle from "./StoryCircle";
import StoryUploadModal from "./StoryUploadModal";
import StoryViewer from "./StoryViewer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileWithCounts, Story as SupabaseStory } from "@/types/supabase";

// For typing story data in this component - separate from the imported type
interface ComponentStory {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
  expires_at: string;
  profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
    display_name: string | null;
    bio: string | null;
    created_at: string;
    updated_at: string;
  };
  viewed_by_user?: boolean;
}

interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: ComponentStory[];
}

// Mock stories for fallback
const mockStories = [
  {
    id: "1",
    user: {
      id: "1",
      username: "janedoe",
      displayName: "Jane Doe",
      profilePicture: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0
    },
    viewed: false
  },
  {
    id: "2",
    user: {
      id: "2",
      username: "johnsmith",
      displayName: "John Smith",
      profilePicture: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0
    },
    viewed: true
  }
];

const StoriesBar = () => {
  const { user, profile } = useAuth();
  const [isStoryUploadOpen, setIsStoryUploadOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [userHasStory, setUserHasStory] = useState(false);

  const { data: stories = [] } = useQuery<ComponentStory[]>({
    queryKey: ['stories'],
    queryFn: async () => {
      if (!user) return [];
      
      // Get stories from the past 24 hours
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          created_at,
          expires_at,
          profile:user_id(*)
        `)
        .lt('expires_at', new Date(Date.now() + 3600 * 1000).toISOString()) // Stories that haven't expired
        .gt('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()) // Stories from the last 24 hours
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching stories:', error);
        return [];
      }
      
      // Check which stories the current user has viewed
      const storiesWithViewStatus = await Promise.all(
        data.map(async (story) => {
          const { data: viewData } = await supabase
            .from('story_views')
            .select('id')
            .eq('story_id', story.id)
            .eq('viewer_id', user.id)
            .maybeSingle();
          
          return {
            ...story,
            viewed_by_user: !!viewData
          };
        })
      );
      
      return storiesWithViewStatus as ComponentStory[];
    },
    enabled: !!user
  });

  // Check if the current user has a story
  useEffect(() => {
    if (user && stories.length > 0) {
      const hasUserStory = stories.some(story => story.user_id === user.id);
      setUserHasStory(hasUserStory);
    }
  }, [stories, user]);

  const handleStoryClick = (index: number) => {
    setSelectedStoryIndex(index);
    setIsStoryViewerOpen(true);
  };

  const handleCreateStoryClick = () => {
    setIsStoryUploadOpen(true);
  };

  return (
    <>
      <div className="py-4 w-full overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 px-1 md:max-w-4xl lg:max-w-5xl mx-auto">
          {/* Create Story */}
          <div className="flex flex-col items-center gap-1 min-w-[64px]" onClick={handleCreateStoryClick}>
            <div className="relative cursor-pointer">
              <Avatar className={cn("h-16 w-16 border border-border", userHasStory && "ring-2 ring-social-purple")}>
                <AvatarImage src={profile?.avatar_url || ""} alt="Your story" className="object-cover" />
                <AvatarFallback>{profile?.username?.substring(0, 2).toUpperCase() || "ME"}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-social-purple rounded-full p-1">
                <Plus className="h-3 w-3 text-white" />
              </div>
            </div>
            <span className="text-xs">Your Story</span>
          </div>

          {/* User Stories */}
          {stories.length > 0 ? (
            stories.map((story, index) => (
              <div key={story.id} className="min-w-[64px] cursor-pointer" onClick={() => handleStoryClick(index)}>
                <StoryCircle 
                  user={{
                    id: story.profile?.id || "",
                    username: story.profile?.username || "",
                    displayName: story.profile?.display_name || story.profile?.username || "",
                    profilePicture: story.profile?.avatar_url || '',
                    bio: story.profile?.bio || '',
                    followers: 0,
                    following: 0,
                    posts: 0
                  }} 
                  viewed={story.viewed_by_user} 
                  hasStory={true}
                />
              </div>
            ))
          ) : (
            // Show mock stories as fallback
            mockStories.map((story, index) => (
              <div key={story.id} className="min-w-[64px] cursor-pointer">
                <StoryCircle user={story.user} viewed={story.viewed} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <StoryUploadModal
        open={isStoryUploadOpen}
        onOpenChange={setIsStoryUploadOpen}
      />

      {stories.length > 0 && (
        <StoryViewer
          open={isStoryViewerOpen}
          onOpenChange={setIsStoryViewerOpen}
          stories={stories as unknown as SupabaseStory[]}
          initialStoryIndex={selectedStoryIndex}
        />
      )}
    </>
  );
};

export default StoriesBar;
