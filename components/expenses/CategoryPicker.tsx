"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CategoryIcon } from "@/components/categories/CategoryIcon";

type CategoryPickerProps = {
  categories: { _id: Id<"categories">; name: string; icon: string }[];
  currentCategoryId: Id<"categories"> | null;
  onSelect: (categoryId: Id<"categories">) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CategoryPicker({
  categories,
  currentCategoryId,
  onSelect,
  open,
  onOpenChange,
}: CategoryPickerProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="max-h-64 overflow-y-auto">
          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => {
                onSelect(cat._id);
                onOpenChange(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-slate-100 transition-colors"
            >
              <CategoryIcon
                name={cat.icon}
                size="sm"
                className="text-slate-600"
              />
              <span className="flex-1 text-left truncate">{cat.name}</span>
              {cat._id === currentCategoryId && (
                <Check className="w-4 h-4 text-blue-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
