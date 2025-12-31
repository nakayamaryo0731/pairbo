"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMOJI_LIST = [
  "🏠",
  "🚗",
  "🐱",
  "🐶",
  "💼",
  "📱",
  "💻",
  "🎵",
  "🎬",
  "📚",
  "✈️",
  "🏥",
  "💄",
  "👶",
  "🎁",
  "🏋️",
  "🍺",
  "☕",
  "🎓",
  "💒",
  "🔧",
  "🪴",
  "📦",
  "🛒",
  "💳",
  "🏦",
  "📝",
  "🎨",
  "🎮",
  "⚽",
  "🎤",
  "📷",
];

type EmojiPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
};

export function EmojiPicker({
  open,
  onOpenChange,
  onSelect,
}: EmojiPickerProps) {
  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>アイコンを選択</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-8 gap-2">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelect(emoji)}
              className="w-8 h-8 text-xl flex items-center justify-center hover:bg-slate-100 rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
