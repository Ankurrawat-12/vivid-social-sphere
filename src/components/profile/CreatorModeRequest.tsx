
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Video, Clock, Check, X } from "lucide-react";

export const CreatorModeRequest = () => {
  const { user } = useAuth();
  const { isCreator } = useUserRole();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  // Check if user has existing request
  const { data: existingRequest } = useQuery({
    queryKey: ["userCreatorRequest", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("creator_requests")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  // Submit creator request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("creator_requests")
        .insert({
          user_id: user.id,
          reason
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userCreatorRequest"] });
      toast.success("Creator request submitted successfully!");
      setIsOpen(false);
      setReason("");
    },
    onError: (error) => {
      console.error("Error submitting creator request:", error);
      toast.error("Failed to submit creator request");
    }
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your creator request");
      return;
    }
    submitRequestMutation.mutate(reason);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case "approved":
        return <Badge variant="default"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  if (isCreator) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Creator Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="default">
              <Check className="h-3 w-3 mr-1" />
              Creator Mode Active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            You can now upload videos longer than 60 seconds and access creator features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Creator Mode
        </CardTitle>
      </CardHeader>
      <CardContent>
        {existingRequest ? (
          <div className="space-y-2">
            {getStatusBadge(existingRequest.status)}
            <p className="text-sm text-muted-foreground">
              {existingRequest.status === "pending" && "Your request is being reviewed by our admin team."}
              {existingRequest.status === "approved" && "Congratulations! Your creator request has been approved."}
              {existingRequest.status === "rejected" && "Your request was not approved. You can submit a new request."}
            </p>
            {existingRequest.reason && (
              <div className="p-2 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Your request:</p>
                <p className="text-sm">{existingRequest.reason}</p>
              </div>
            )}
            {existingRequest.status === "rejected" && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Submit New Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Creator Mode</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reason">Why do you want creator mode?</Label>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Tell us why you want to become a creator..."
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit} disabled={submitRequestMutation.isPending}>
                        Submit Request
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upgrade to creator mode to upload longer videos and access advanced features.
            </p>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Video className="h-4 w-4 mr-2" />
                  Request Creator Mode
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Creator Mode</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">Why do you want creator mode?</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Tell us why you want to become a creator..."
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitRequestMutation.isPending}>
                      Submit Request
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
