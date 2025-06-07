
import React, { useState } from "react";
import { MoreHorizontal, Trash, Flag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReportModal } from "./ReportModal";

interface PostActionsProps {
  postId: string;
  userId: string;
  imageUrl?: string;
}

const PostActions: React.FC<PostActionsProps> = ({ postId, userId, imageUrl }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === userId;

  const handleDelete = async () => {
    if (!isOwner) return;
    
    setIsDeleting(true);
    try {
      // Delete the post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);
        
      if (error) throw error;
      
      // Delete image from storage if URL is provided
      if (imageUrl) {
        // Extract the file path from the URL
        const storageUrl = new URL(imageUrl);
        const pathWithBucket = storageUrl.pathname.substring(1); // Remove leading slash
        const pathParts = pathWithBucket.split("/");
        pathParts.shift(); // Remove bucket name
        const storagePath = pathParts.join("/");
        
        if (storagePath) {
          const { error: storageError } = await supabase.storage
            .from("posts")
            .remove([storagePath]);
            
          if (storageError) console.error("Error removing image:", storageError);
        }
      }
      
      // Invalidate posts query to refresh feed
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      
      toast.success("Post deleted successfully");
      
      // Navigate back to profile if on post detail page
      if (window.location.pathname.includes("/post/")) {
        navigate("/profile");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hover:bg-muted rounded-full p-1">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOwner ? (
            <DropdownMenuItem 
              className="text-red-500 flex cursor-pointer" 
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete Post
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              className="text-orange-500 flex cursor-pointer" 
              onClick={() => setIsReportModalOpen(true)}
            >
              <Flag className="mr-2 h-4 w-4" />
              Report Post
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-500 hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        postId={postId}
        reportedUserId={userId}
      />
    </>
  );
};

export default PostActions;
