import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, UserMinus } from "lucide-react";

interface CreatorRequest {
  id: string;
  reason: string | null;
  status: string | null;
  requested_at: string | null;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
  };
}

interface CreatorUser {
  id: string;
  user_id: string;
  granted_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
  };
}

export const CreatorRequests = () => {
  const queryClient = useQueryClient();

  // Fetch pending creator requests
  const { data: creatorRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["adminCreatorRequests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_requests")
        .select(`
          id,
          reason,
          status,
          requested_at,
          user_id
        `)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
      
      if (error) throw error;

      // Fetch profiles for each request
      const requestsWithProfiles = await Promise.all(
        data.map(async (request) => {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, username, display_name")
            .eq("id", request.user_id)
            .single();
          
          if (profileError) throw profileError;
          
          return {
            ...request,
            profiles: profile
          };
        })
      );
      
      return requestsWithProfiles as CreatorRequest[];
    }
  });

  // Fetch current creators
  const { data: currentCreators = [], isLoading: loadingCreators } = useQuery({
    queryKey: ["adminCurrentCreators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          granted_at
        `)
        .eq("role", "creator")
        .order("granted_at", { ascending: false });
      
      if (error) throw error;

      // Fetch profiles for each creator
      const creatorsWithProfiles = await Promise.all(
        data.map(async (creator) => {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, username, display_name")
            .eq("id", creator.user_id)
            .single();
          
          if (profileError) throw profileError;
          
          return {
            ...creator,
            profiles: profile
          };
        })
      );
      
      return creatorsWithProfiles as CreatorUser[];
    }
  });

  // Update creator request mutation
  const updateCreatorRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, userId }: { requestId: string; status: string; userId: string }) => {
      // Update the creator request status
      const { error: requestError } = await supabase
        .from("creator_requests")
        .update({ 
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // If approved, grant creator role
      if (status === "approved") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: "creator"
          });

        if (roleError) throw roleError;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["adminCreatorRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminCurrentCreators"] });
      if (status === "approved") {
        toast.success("Creator role granted successfully");
      } else {
        toast.success("Creator request " + status);
      }
    },
    onError: (error) => {
      console.error("Error updating creator request:", error);
      toast.error("Failed to update creator request");
    }
  });

  // Revoke creator role mutation
  const revokeCreatorMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "creator");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCurrentCreators"] });
      toast.success("Creator role revoked successfully");
    },
    onError: (error) => {
      console.error("Error revoking creator role:", error);
      toast.error("Failed to revoke creator role");
    }
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Pending Creator Requests */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Pending Creator Requests</h3>
        
        {loadingRequests ? (
          <div className="text-center">Loading creator requests...</div>
        ) : creatorRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No pending creator requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {creatorRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">@{request.profiles.username}</span>
                        {request.profiles.display_name && (
                          <span className="text-muted-foreground">({request.profiles.display_name})</span>
                        )}
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Requested: {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : "Unknown"}
                      </p>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Reason:</p>
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm">{request.reason}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateCreatorRequestMutation.mutate({ 
                        requestId: request.id, 
                        status: "approved",
                        userId: request.user_id 
                      })}
                      disabled={updateCreatorRequestMutation.isPending}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateCreatorRequestMutation.mutate({ 
                        requestId: request.id, 
                        status: "rejected",
                        userId: request.user_id 
                      })}
                      disabled={updateCreatorRequestMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Current Creators */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Current Creators</h3>
        
        {loadingCreators ? (
          <div className="text-center">Loading current creators...</div>
        ) : currentCreators.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No creators found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {currentCreators.map((creator) => (
              <Card key={creator.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">@{creator.profiles.username}</span>
                      {creator.profiles.display_name && (
                        <span className="text-muted-foreground">({creator.profiles.display_name})</span>
                      )}
                      <Badge variant="default" className="bg-purple-500">Creator</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Granted: {new Date(creator.granted_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => revokeCreatorMutation.mutate(creator.user_id)}
                    disabled={revokeCreatorMutation.isPending}
                  >
                    <UserMinus className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
