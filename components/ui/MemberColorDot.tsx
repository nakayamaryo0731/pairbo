import { cn } from "@/lib/utils";

type MemberColorDotProps = {
  color: string | undefined;
  className?: string;
};

export function MemberColorDot({ color, className }: MemberColorDotProps) {
  if (!color) return null;
  return (
    <span
      className={cn(
        "inline-block w-2.5 h-2.5 rounded-full shrink-0",
        className,
      )}
      style={{ backgroundColor: color }}
    />
  );
}
