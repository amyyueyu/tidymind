interface TiddyMascotProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  rounded?: "circle" | "square";
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-20 h-20",
  xl: "w-28 h-28",
};

export const TiddyMascot = ({
  size = "md",
  className = "",
  rounded = "square",
}: TiddyMascotProps) => {
  return (
    <div
      className={`overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${
        rounded === "circle" ? "rounded-full" : "rounded-2xl"
      } ${className}`}
    >
      <video
        src="/tiddy.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
};
