
import React from "react";
import StoryCircle from "./StoryCircle";
import { mockStories } from "@/data/mock-data";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { currentUser } from "@/data/mock-data";

const StoriesBar = () => {
  return (
    <div className="py-4 w-full overflow-x-auto scrollbar-hide">
      <div className="flex gap-4 max-w-lg mx-auto px-2">
        {/* Create Story */}
        <div className="flex flex-col items-center gap-1 min-w-[64px]">
          <div className="relative">
            <Avatar className="h-16 w-16 border border-border">
              <img src={currentUser.profilePicture} alt="Your story" className="object-cover" />
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-social-purple rounded-full p-1">
              <Plus className="h-3 w-3 text-white" />
            </div>
          </div>
          <span className="text-xs">Your Story</span>
        </div>

        {/* User Stories */}
        {mockStories.map((story) => (
          <div key={story.id} className="min-w-[64px]">
            <StoryCircle user={story.user} viewed={story.viewed} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoriesBar;
