
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Eye } from "lucide-react";

interface Post {
  id: string;
  caption: string | null;
  image_url: string | null;
  video_url: string | null;
  media_type: string;
  created_at: string;
  profile: {
    username: string;
    display_name: string | null;
  };
}

export const PostModeration = () => {
  const queryClient = useQueryClient();

  // Fetch all posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["adminPosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profile:user_id(username, display_name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Post[];
    }
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPosts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Post Moderation</h3>

      {isLoading ? (
        <div className="text-center">Loading posts...</div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    {post.media_type === "video" && post.video_url ? (
                      <video 
                        src={post.video_url} 
                        className="w-20 h-20 object-cover rounded-md"
                        controls={false}
                      />
                    ) : (
                      <img 
                        src={post.image_url || ""} 
                        alt="Post" 
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">@{post.profile.username}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                        {post.caption && (
                          <p className="text-sm mt-2 line-clamp-2">{post.caption}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(post.image_url || post.video_url || "", "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePostMutation.mutate(post.id)}
                          disabled={deletePostMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
