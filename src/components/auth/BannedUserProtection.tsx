
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Ban, AlertTriangle } from "lucide-react";
import { useState } from "react";

export const BannedUserProtection = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [unbanReason, setUnbanReason] = useState("");
  const [showUnbanForm, setShowUnbanForm] = useState(false);

  // Check if user is banned
  const { data: profile, isLoading } = useQuery({
    queryKey: ["userBanStatus", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("is_banned, banned_at")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Check for existing unban requests
  const { data: unbanRequest } = useQuery({
    queryKey: ["unbanRequest", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("unban_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && profile?.is_banned
  });

  // Submit unban request
  const unbanRequestMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("unban_requests")
        .insert({
          user_id: user.id,
          reason
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unbanRequest", user?.id] });
      toast.success("Unban request submitted successfully");
      setUnbanReason("");
      setShowUnbanForm(false);
    },
    onError: (error) => {
      console.error("Error submitting unban request:", error);
      toast.error("Failed to submit unban request");
    }
  });

  const handleUnbanRequest = () => {
    if (!unbanReason.trim()) {
      toast.error("Please provide a reason for your unban request");
      return;
    }
    unbanRequestMutation.mutate(unbanReason);
  };

  const handleLogout = async () => {
    await signOut?.();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-social-purple"></div>
      </div>
    );
  }

  // If user is banned, show ban message
  if (profile?.is_banned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Ban className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Account Banned</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-muted-foreground">
              <p>Your account has been banned.</p>
              <p className="text-sm mt-2">
                Banned on: {new Date(profile.banned_at || "").toLocaleDateString()}
              </p>
            </div>

            {unbanRequest ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-600 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Unban Request Pending</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your unban request is currently being reviewed by administrators.
                </p>
              </div>
            ) : showUnbanForm ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="unbanReason">Reason for Unban Request</Label>
                  <Textarea
                    id="unbanReason"
                    value={unbanReason}
                    onChange={(e) => setUnbanReason(e.target.value)}
                    placeholder="Please explain why you believe your account should be unbanned..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleUnbanRequest}
                    disabled={unbanRequestMutation.isPending}
                    className="flex-1"
                  >
                    {unbanRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUnbanForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  onClick={() => setShowUnbanForm(true)}
                  className="w-full"
                >
                  Request Unban
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="w-full"
                >
                  Logout
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
