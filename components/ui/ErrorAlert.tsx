import { cn } from "@/lib/utils";

type ErrorAlertProps = {
  message: string | null;
  className?: string;
};

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  if (!message) return null;
  return (
    <div
      className={cn(
        "p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl",
        className,
      )}
    >
      {message}
    </div>
  );
}
