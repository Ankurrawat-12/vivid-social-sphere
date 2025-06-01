
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid, Bookmark } from "lucide-react";
import UserPostsGrid from "./UserPostsGrid";
import SavedPostsGrid from "./SavedPostsGrid";
import { ProfileWithCounts } from "@/types/supabase";

interface ProfileContentProps {
  profileData: ProfileWithCounts;
  isOwnProfile: boolean;
  canViewContent: boolean;
}

const ProfileContent = ({ profileData, isOwnProfile, canViewContent }: ProfileContentProps) => {
  const [activeTab, setActiveTab] = useState("posts");

  if (!canViewContent) {
    return (
      <div className="mt-8 text-center text-muted-foreground">
        <p>This account is private</p>
        <p className="text-sm mt-1">Follow this account to see their posts</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            Posts
          </TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Saved
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="posts" className="mt-6">
          <UserPostsGrid userId={profileData.id} profile={profileData} />
        </TabsContent>
        
        {isOwnProfile && (
          <TabsContent value="saved" className="mt-6">
            <SavedPostsGrid userId={profileData.id} profile={profileData} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ProfileContent;
