
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import EditProfileForm from "@/components/profile/EditProfileForm";
import ProfileSettings from "@/components/profile/ProfileSettings";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileContent from "@/components/profile/ProfileContent";
import { useProfileData } from "@/hooks/useProfileData";

const Profile = () => {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const {
    profileData,
    isLoading,
    followMutation,
    isOwnProfile,
    isFollowing,
    isRequestPending,
    isPrivateAccount,
    canViewContent
  } = useProfileData(username);

  // Redirect to the current user's profile if no username is provided
  useEffect(() => {
    if (!username && profileData?.username) {
      navigate(`/profile/${profileData.username}`);
    }
  }, [username, profileData, navigate]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-6">
          <div className="animate-pulse space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="rounded-full bg-muted h-24 w-24 md:h-32 md:w-32"></div>
              <div className="w-full space-y-4">
                <div className="h-7 bg-muted rounded w-1/3"></div>
                <div className="flex gap-6">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profileData) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-6 text-center">
          <h1 className="text-2xl font-semibold">Profile not found</h1>
          <p className="text-muted-foreground mt-2">The user you're looking for doesn't exist or has been removed.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Profile Header */}
        <ProfileHeader
          profileData={profileData}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          isRequestPending={isRequestPending}
          isPrivateAccount={isPrivateAccount}
          followMutation={followMutation}
          isEditProfileOpen={isEditProfileOpen}
          setIsEditProfileOpen={setIsEditProfileOpen}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
        />

        {/* Profile Content Tabs */}
        <ProfileContent
          profileData={profileData}
          isOwnProfile={isOwnProfile}
          canViewContent={canViewContent}
        />

        {/* Modals - Always render the Dialog components but conditionally render their content */}
        <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
          <DialogContent className="sm:max-w-[425px]">
            {isEditProfileOpen && <EditProfileForm onComplete={() => setIsEditProfileOpen(false)} />}
          </DialogContent>
        </Dialog>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-[425px]">
            {isSettingsOpen && <ProfileSettings onComplete={() => setIsSettingsOpen(false)} />}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Profile;
