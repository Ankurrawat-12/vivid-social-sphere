
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MusicManager } from "./MusicManager";
import { UserManagement } from "./UserManagement";
import { PostModeration } from "./PostModeration";
import { CreatorRequests } from "./CreatorRequests";
import { ReportsManagement } from "./ReportsManagement";
import { UnbanRequestsManagement } from "./UnbanRequestsManagement";

const AdminPanel = () => {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Admin Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="music" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="music">Music Library</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="posts">Post Moderation</TabsTrigger>
              <TabsTrigger value="creators">Creator Requests</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="unbans">Unban Requests</TabsTrigger>
            </TabsList>
            
            <TabsContent value="music" className="mt-6">
              <MusicManager />
            </TabsContent>
            
            <TabsContent value="users" className="mt-6">
              <UserManagement />
            </TabsContent>
            
            <TabsContent value="posts" className="mt-6">
              <PostModeration />
            </TabsContent>
            
            <TabsContent value="creators" className="mt-6">
              <CreatorRequests />
            </TabsContent>
            
            <TabsContent value="reports" className="mt-6">
              <ReportsManagement />
            </TabsContent>
            
            <TabsContent value="unbans" className="mt-6">
              <UnbanRequestsManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
