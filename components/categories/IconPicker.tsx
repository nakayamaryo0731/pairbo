"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ICON_CATEGORIES, getIconComponent } from "@/lib/categoryIcons";

type IconPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (iconName: string) => void;
};

export function IconPicker({ open, onOpenChange, onSelect }: IconPickerProps) {
  const handleSelect = (iconName: string) => {
    onSelect(iconName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>アイコンを選択</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {ICON_CATEGORIES.map((category) => (
            <div key={category.label}>
              <p className="text-xs font-medium text-slate-400 mb-2">
                {category.label}
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {category.icons.map((iconName) => {
                  const Icon = getIconComponent(iconName);
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => handleSelect(iconName)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Icon className="h-5 w-5 text-slate-700" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
