import React from "react";
import { cn } from "../../lib/utils";

const LoadingSpinner = ({
  size = "md",
  color = "blue",
  className = "",
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
    xl: "h-16 w-16 border-4",
  };

  const colorClasses = {
    blue: "border-blue-600 border-t-transparent",
    indigo: "border-indigo-600 border-t-transparent",
    purple: "border-purple-600 border-t-transparent",
    green: "border-green-600 border-t-transparent",
    red: "border-red-600 border-t-transparent",
    gray: "border-gray-600 border-t-transparent",
  };

  const spinner = (
    <div
      className={cn(
        "animate-spin rounded-full",
        sizeClasses[size],
        colorClasses[color],
        className,
      )}
    ></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
