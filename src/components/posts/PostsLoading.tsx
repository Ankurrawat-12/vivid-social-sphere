
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const PostsLoading: React.FC = () => {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {[1, 2, 3].map((index) => (
        <div key={index} className="border border-border rounded-md">
          <div className="p-3 flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-96 w-full" />
          <div className="p-3 space-y-2">
            <div className="flex gap-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostsLoading;
