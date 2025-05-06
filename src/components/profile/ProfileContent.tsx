
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookmark, Film, Grid, User as UserIcon } from "lucide-react";
import UserPostsGrid from "@/components/profile/UserPostsGrid";
import { ProfileWithCounts } from "@/types/supabase";

interface ProfileContentProps {
  profileData: ProfileWithCounts;
  isOwnProfile: boolean;
  canViewContent: boolean;
}

const ProfileContent: React.FC<ProfileContentProps> = ({
  profileData,
  isOwnProfile,
  canViewContent
}) => {
  return (
    <Tabs defaultValue="posts">
      <TabsList className="w-full">
        <TabsTrigger value="posts" className="flex-1">
          <Grid className="h-4 w-4 mr-2" />
          Posts
        </TabsTrigger>
        <TabsTrigger value="saved" className="flex-1" disabled={!isOwnProfile}>
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
        {profileData && <UserPostsGrid userId={profileData.id} profile={profileData} />}
      </TabsContent>
      
      <TabsContent value="saved" className="mt-6">
        <div className="h-40 flex items-center justify-center text-social-text-secondary">
          {isOwnProfile ? "No saved posts yet" : "This tab is only visible to the profile owner"}
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
  );
};

export default ProfileContent;
