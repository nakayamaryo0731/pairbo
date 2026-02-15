"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

type InlineEditTextProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  autoFocus?: boolean;
};

/**
 * テキスト入力用のインライン編集フィールド
 * blur または Enter で保存、Escape でキャンセル
 */
export function InlineEditText({
  value,
  onChange,
  maxLength,
  placeholder,
  onSave,
  onCancel,
  isSaving,
  autoFocus = true,
}: InlineEditTextProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onSave}
      className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      maxLength={maxLength}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={isSaving}
    />
  );
}

type InlineEditDisplayProps = {
  children: ReactNode;
  editable?: boolean;
  onEdit?: () => void;
};

/**
 * 値の表示＋編集ヒント
 * editable=true の場合、全体がタップ領域になり、小さな鉛筆アイコンがヒントとして表示される
 */
export function InlineEditDisplay({
  children,
  editable = true,
  onEdit,
}: InlineEditDisplayProps) {
  if (editable && onEdit) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
      >
        {children}
        <Pencil className="h-3 w-3 text-slate-400 shrink-0" />
      </button>
    );
  }

  return <div className="flex items-center gap-2">{children}</div>;
}
