
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  commentId?: string;
  reportedUserId: string;
}

const reportReasons = [
  "Spam or misleading content",
  "Harassment or bullying",
  "Hate speech or violence",
  "Inappropriate content",
  "Copyright violation",
  "Other"
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  postId,
  commentId,
  reportedUserId
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      const reason = selectedReason === "Other" ? customReason : selectedReason;
      
      if (!reason.trim()) {
        throw new Error("Please select or provide a reason for reporting");
      }

      const { error } = await supabase
        .from("reports")
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          post_id: postId || null,
          comment_id: commentId || null,
          reason: reason.trim()
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report submitted successfully");
      setSelectedReason("");
      setCustomReason("");
      onClose();
    },
    onError: (error: any) => {
      console.error("Error submitting report:", error);
      toast.error(error.message || "Failed to submit report");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {postId ? "Post" : "Comment"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Why are you reporting this {postId ? "post" : "comment"}?</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="mt-2">
              {reportReasons.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label htmlFor={reason} className="text-sm">{reason}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "Other" && (
            <div>
              <Label htmlFor="customReason">Please specify</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                required
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedReason || reportMutation.isPending}
              className="flex-1"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
