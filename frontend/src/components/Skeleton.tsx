import React from "react";

// A simple, reusable shimmering box
const Skeleton = ({ className }: { className?: string }) => {
  return (
    <div className={`animate-pulse bg-muted rounded-md ${className}`} />
  );
};

export default Skeleton;