
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Eye, Check, X } from "lucide-react";

interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: {
    username: string;
  };
  reported_user: {
    username: string;
  };
  post?: {
    id: string;
    caption: string | null;
    image_url: string;
  };
  comment?: {
    id: string;
    content: string;
  };
}

export const ReportsManagement = () => {
  const queryClient = useQueryClient();

  // Fetch all reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["adminReports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(username),
          reported_user:profiles!reports_reported_user_id_fkey(username),
          post:posts(id, caption, image_url),
          comment:comments(id, content)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Report[];
    }
  });

  // Update report status mutation
  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const { error } = await supabase
        .from("reports")
        .update({ 
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      toast.success("Report status updated");
    },
    onError: (error) => {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
    }
  });

  // Delete reported content mutation
  const deleteContentMutation = useMutation({
    mutationFn: async ({ postId, commentId }: { postId?: string; commentId?: string }) => {
      if (postId) {
        const { error } = await supabase
          .from("posts")
          .delete()
          .eq("id", postId);
        if (error) throw error;
      } else if (commentId) {
        const { error } = await supabase
          .from("comments")
          .delete()
          .eq("id", commentId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      toast.success("Content deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting content:", error);
      toast.error("Failed to delete content");
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "reviewed":
        return <Badge variant="default">Reviewed</Badge>;
      case "dismissed":
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Content Reports</h3>

      {isLoading ? (
        <div className="text-center">Loading reports...</div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">@{report.reporter.username}</span>
                      <span className="text-muted-foreground">reported</span>
                      <span className="font-medium">@{report.reported_user.username}</span>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Reason: {report.reason}</p>
                  
                  {report.post && (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium mb-2">Reported Post:</p>
                      <div className="flex gap-3">
                        {report.post.image_url && (
                          <img 
                            src={report.post.image_url} 
                            alt="Reported post" 
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="text-sm">{report.post.caption || "No caption"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {report.comment && (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium mb-2">Reported Comment:</p>
                      <p className="text-sm">{report.comment.content}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {report.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateReportMutation.mutate({ reportId: report.id, status: "reviewed" })}
                        disabled={updateReportMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReportMutation.mutate({ reportId: report.id, status: "dismissed" })}
                        disabled={updateReportMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    </>
                  )}
                  
                  {(report.post || report.comment) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteContentMutation.mutate({ 
                        postId: report.post?.id, 
                        commentId: report.comment?.id 
                      })}
                      disabled={deleteContentMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Content
                    </Button>
                  )}
                  
                  {report.post && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(report.post?.image_url, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Full
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
