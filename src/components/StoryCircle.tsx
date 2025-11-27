interface StoryCircleProps {
  image?: string;
  name: string;
  hasStory?: boolean;
  size?: "sm" | "md" | "lg";
}

const StoryCircle = ({ image, name, hasStory = false, size = "md" }: StoryCircleProps) => {
  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-24 h-24"
  };

  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer">
      <div
        className={`${sizeClasses[size]} rounded-full p-0.5 ${
          hasStory
            ? "bg-gradient-to-tr from-primary via-accent to-secondary animate-pulse-glow"
            : "bg-border"
        } transition-transform hover:scale-105`}
      >
        <div className="w-full h-full rounded-full bg-background p-0.5">
          <div
            className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden"
          >
            {image ? (
              <img src={image} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-foreground font-semibold">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
      <span className="text-xs text-foreground truncate max-w-[80px]">{name}</span>
    </div>
  );
};

export default StoryCircle;
