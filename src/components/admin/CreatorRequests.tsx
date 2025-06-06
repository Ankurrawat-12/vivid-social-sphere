
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";

interface CreatorRequest {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  requested_at: string;
  profiles: {
    username: string;
    display_name: string | null;
  };
}

export const CreatorRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch creator requests with proper join to profiles
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["creatorRequests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_requests")
        .select(`
          id,
          user_id,
          status,
          reason,
          requested_at,
          reviewed_at,
          reviewed_by
        `)
        .order("requested_at", { ascending: false });
      
      if (error) throw error;

      // Fetch profiles separately for each request
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("id", request.user_id)
            .single();

          return {
            ...request,
            profiles: profile || { username: "Unknown", display_name: null }
          };
        })
      );

      return requestsWithProfiles as CreatorRequest[];
    }
  });

  // Review creator request mutation
  const reviewRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: "approve" | "reject" }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("creator_requests")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq("id", requestId);

      if (error) throw error;

      // If approved, grant creator role
      if (action === "approve") {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: request.user_id,
              role: "creator",
              granted_by: user.id
            });

          if (roleError) throw roleError;

          // Create notification
          await supabase
            .from("notifications")
            .insert({
              type: "creator_approved",
              source_user_id: user.id,
              target_user_id: request.user_id,
              content: "Your creator request has been approved! You can now upload longer videos."
            });
        }
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["creatorRequests"] });
      toast.success(`Request ${action === "approve" ? "approved" : "rejected"} successfully`);
    },
    onError: (error) => {
      console.error("Error reviewing request:", error);
      toast.error("Failed to review request");
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="default"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Creator Requests</h3>

      {isLoading ? (
        <div className="text-center">Loading creator requests...</div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">@{request.profiles.username}</h4>
                    {request.profiles.display_name && (
                      <p className="text-sm text-muted-foreground">{request.profiles.display_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Requested {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                    {request.reason && (
                      <p className="text-sm mt-2 p-2 bg-muted rounded-md">{request.reason}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => reviewRequestMutation.mutate({ requestId: request.id, action: "approve" })}
                          disabled={reviewRequestMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => reviewRequestMutation.mutate({ requestId: request.id, action: "reject" })}
                          disabled={reviewRequestMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {requests.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No creator requests yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
