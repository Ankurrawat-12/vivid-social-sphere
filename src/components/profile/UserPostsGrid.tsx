
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MessageSquare, Image as ImageIcon } from "lucide-react";
import { PostWithProfile } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";

interface UserPostsGridProps {
  userId: string;
}

const UserPostsGrid = ({ userId }: UserPostsGridProps) => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["userPosts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      return data as PostWithProfile[];
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <div className="h-40 flex items-center justify-center text-social-text-secondary">
        No posts yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((post) => (
        <div key={post.id} className="relative cursor-pointer group">
          <AspectRatio ratio={1}>
            <img 
              src={post.image_url} 
              alt={post.caption || "Post"} 
              className="object-cover w-full h-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg";
              }}
            />
          </AspectRatio>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <div className="text-white flex items-center">
              {post.caption ? (
                <MessageSquare className="h-5 w-5 mr-1" />
              ) : (
                <ImageIcon className="h-5 w-5 mr-1" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserPostsGrid;
