
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, UserCheck } from "lucide-react";

interface UnbanRequest {
  id: string;
  reason: string;
  status: string;
  requested_at: string;
  user: {
    username: string;
    display_name: string | null;
  };
}

export const UnbanRequestsManagement = () => {
  const queryClient = useQueryClient();

  // Fetch all unban requests
  const { data: unbanRequests = [], isLoading } = useQuery({
    queryKey: ["adminUnbanRequests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unban_requests")
        .select(`
          *,
          user:user_id(username, display_name)
        `)
        .order("requested_at", { ascending: false });
      
      if (error) throw error;
      return data as UnbanRequest[];
    }
  });

  // Update unban request mutation
  const updateUnbanRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, userId }: { requestId: string; status: string; userId: string }) => {
      // Update the unban request status
      const { error: requestError } = await supabase
        .from("unban_requests")
        .update({ 
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // If approved, unban the user
      if (status === "approved") {
        const { error: unbanError } = await supabase
          .from("profiles")
          .update({ 
            is_banned: false,
            banned_at: null
          })
          .eq("id", userId);

        if (unbanError) throw unbanError;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["adminUnbanRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      if (status === "approved") {
        toast.success("User unbanned successfully");
      } else {
        toast.success("Unban request " + status);
      }
    },
    onError: (error) => {
      console.error("Error updating unban request:", error);
      toast.error("Failed to update unban request");
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Unban Requests</h3>

      {isLoading ? (
        <div className="text-center">Loading unban requests...</div>
      ) : (
        <div className="grid gap-4">
          {unbanRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">@{request.user.username}</span>
                      {request.user.display_name && (
                        <span className="text-muted-foreground">({request.user.display_name})</span>
                      )}
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested: {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Reason for Unban:</p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{request.reason}</p>
                  </div>
                </div>

                {request.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateUnbanRequestMutation.mutate({ 
                        requestId: request.id, 
                        status: "approved",
                        userId: request.user.id 
                      })}
                      disabled={updateUnbanRequestMutation.isPending}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve & Unban
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateUnbanRequestMutation.mutate({ 
                        requestId: request.id, 
                        status: "rejected",
                        userId: request.user.id 
                      })}
                      disabled={updateUnbanRequestMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
