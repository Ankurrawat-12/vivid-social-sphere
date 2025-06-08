
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ban, UserCheck, Shield } from "lucide-react";

interface User {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  created_at: string;
}

export const UserManagement = () => {
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as User[];
    }
  });

  // Ban/unban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, ban }: { userId: string; ban: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_banned: ban,
          banned_at: ban ? new Date().toISOString() : null
        })
        .eq("id", userId);

      if (error) throw error;

      // If banning user, also revoke all their roles
      if (ban) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);
        
        if (roleError) console.error("Error removing user roles:", roleError);
      }
    },
    onSuccess: (_, { ban }) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminCurrentCreators"] });
      queryClient.invalidateQueries({ queryKey: ["userCreatorRole"] });
      toast.success(ban ? "User banned successfully" : "User unbanned successfully");
    },
    onError: (error) => {
      console.error("Error updating user ban status:", error);
      toast.error("Failed to update user status");
    }
  });

  // Grant admin role mutation
  const grantAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin"
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Admin role granted successfully");
    },
    onError: (error) => {
      console.error("Error granting admin role:", error);
      toast.error("Failed to grant admin role");
    }
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">User Management</h3>

      {isLoading ? (
        <div className="text-center">Loading users...</div>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="text-sm font-medium">{user.username[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">@{user.username}</h4>
                    {user.display_name && (
                      <p className="text-sm text-muted-foreground">{user.display_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {user.is_banned && (
                    <Badge variant="destructive">Banned</Badge>
                  )}
                  
                  <Button
                    variant={user.is_banned ? "default" : "destructive"}
                    size="sm"
                    onClick={() => banUserMutation.mutate({ userId: user.id, ban: !user.is_banned })}
                    disabled={banUserMutation.isPending}
                  >
                    {user.is_banned ? (
                      <>
                        <UserCheck className="h-4 w-4 mr-1" />
                        Unban
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 mr-1" />
                        Ban
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => grantAdminMutation.mutate(user.id)}
                    disabled={grantAdminMutation.isPending}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Make Admin
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
