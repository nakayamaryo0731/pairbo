"use client";

import { Check } from "lucide-react";
import { TAG_COLORS, getTagColorClasses } from "@/lib/tagColors";

type TagColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function TagColorPicker({ value, onChange }: TagColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {TAG_COLORS.map((color) => {
        const classes = getTagColorClasses(color);
        const isSelected = color === value;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${classes.bg} ${
              isSelected
                ? "ring-2 ring-offset-2 ring-blue-500"
                : "hover:scale-110"
            }`}
          >
            {isSelected && <Check className={`w-4 h-4 ${classes.text}`} />}
          </button>
        );
      })}
    </div>
  );
}
