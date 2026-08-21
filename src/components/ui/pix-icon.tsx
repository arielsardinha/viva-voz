import React from "react";
import { cn } from "@/lib/utils";

interface PixIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Ícone oficial vetorial do Pix
 */
export function PixIcon({ className = "size-4", ...props }: PixIconProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M407.2 384.8c-20.9 0-40.4-8.1-55.2-22.9l-72.3-72.3c-13.1-13.1-34.4-13.1-47.5 0l-72.3 72.3c-14.8 14.8-34.3 22.9-55.2 22.9-20.9 0-40.4-8.1-55.2-22.9l-22.9-22.9c-30.5-30.5-30.5-79.9 0-110.4l22.9-22.9c14.8-14.8 34.3-22.9 55.2-22.9 20.9 0 40.4 8.1 55.2 22.9l72.3 72.3c13.1 13.1 34.4 13.1 47.5 0l72.3-72.3c14.8-14.8 34.3-22.9 55.2-22.9 20.9 0 40.4 8.1 55.2 22.9l22.9 22.9c30.5 30.5 30.5 79.9 0 110.4l-22.9 22.9c-14.8 14.8-34.4 22.9-55.3 22.9z" />
    </svg>
  );
}

/**
 * Badge com a logo do Pix sobre o fundo da cor primária turquesa (#32BCAD)
 */
export function PixBrandBadge({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "size-6 rounded-lg",
    md: "size-8 rounded-xl",
    lg: "size-12 rounded-2xl",
  };

  const iconSizes = {
    sm: "size-3.5",
    md: "size-5",
    lg: "size-7",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-[#32BCAD] text-white shadow-md shadow-[#32BCAD]/25 shrink-0",
        sizeClasses[size],
        className
      )}
    >
      <PixIcon className={iconSizes[size]} />
    </div>
  );
}
