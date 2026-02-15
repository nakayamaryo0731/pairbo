import { createElement } from "react";
import { getIconComponent } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
} as const;

type CategoryIconProps = {
  name: string;
  size?: keyof typeof sizeClasses;
  className?: string;
};

export function CategoryIcon({
  name,
  size = "md",
  className,
}: CategoryIconProps) {
  return createElement(getIconComponent(name), {
    className: cn(sizeClasses[size], className),
  });
}
