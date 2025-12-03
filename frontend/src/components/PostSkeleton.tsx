import React from "react";
import Skeleton from "./Skeleton";

const PostSkeleton = () => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      {/* Header: Avatar + Name */}
      <div className="flex gap-3 items-center">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
      
      {/* Content lines */}
      <div className="space-y-2">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-3/4 h-4" />
      </div>

      {/* Big Image block */}
      <Skeleton className="w-full h-64 rounded-lg" />
    </div>
  );
};

export default PostSkeleton;