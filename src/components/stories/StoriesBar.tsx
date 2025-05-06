
import React, { useState } from "react";
import StoryCircle from "./StoryCircle";
import { mockStories } from "@/data/mock-data";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { currentUser } from "@/data/mock-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Story } from "@/types/supabase";
import StoryUploadModal from "./StoryUploadModal";
import StoryViewer from "./StoryViewer";

const StoriesBar = () => {
  const { user } = useAuth();
  const [isStoryUploadOpen, setIsStoryUploadOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  const { data: stories = [] } = useQuery({
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
      
      return storiesWithViewStatus as Story[];
    },
    enabled: !!user
  });

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
              <Avatar className="h-16 w-16 border border-border">
                {/* Fix: Use profile?.avatar_url instead of user?.profilePicture */}
                <img src={user?.profile?.avatar_url || currentUser.profilePicture} alt="Your story" className="object-cover" />
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
                    id: story.profile.id,
                    username: story.profile.username,
                    displayName: story.profile.display_name || story.profile.username,
                    profilePicture: story.profile.avatar_url || '',
                    bio: story.profile.bio || '',
                    followers: 0,
                    following: 0,
                    posts: 0
                  }} 
                  viewed={story.viewed_by_user} 
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
          stories={stories}
          initialStoryIndex={selectedStoryIndex}
        />
      )}
    </>
  );
};

export default StoriesBar;
