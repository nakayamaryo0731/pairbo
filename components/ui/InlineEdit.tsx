"use client";

import type { ReactNode } from "react";
import { Check, X, Pencil } from "lucide-react";

type InlineEditControlsProps = {
  /**
   * 保存ボタンのクリックハンドラー
   */
  onSave: () => void;
  /**
   * キャンセルボタンのクリックハンドラー
   */
  onCancel: () => void;
  /**
   * 保存中かどうか
   */
  isSaving?: boolean;
};

/**
 * インライン編集用の保存/キャンセルボタン
 */
export function InlineEditControls({
  onSave,
  onCancel,
  isSaving,
}: InlineEditControlsProps) {
  return (
    <>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
        aria-label="保存"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={onCancel}
        disabled={isSaving}
        className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-50"
        aria-label="キャンセル"
      >
        <X className="h-4 w-4" />
      </button>
    </>
  );
}

type InlineEditButtonProps = {
  /**
   * 編集ボタンのクリックハンドラー
   */
  onClick: () => void;
  /**
   * 無効化するかどうか
   */
  disabled?: boolean;
};

/**
 * インライン編集を開始する鉛筆ボタン
 */
export function InlineEditButton({ onClick, disabled }: InlineEditButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50"
      aria-label="編集"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

type InlineEditTextProps = {
  /**
   * 現在の値
   */
  value: string;
  /**
   * 値が変更された時のハンドラー
   */
  onChange: (value: string) => void;
  /**
   * 最大文字数
   */
  maxLength?: number;
  /**
   * プレースホルダー
   */
  placeholder?: string;
  /**
   * 保存ハンドラー
   */
  onSave: () => void;
  /**
   * キャンセルハンドラー
   */
  onCancel: () => void;
  /**
   * 保存中かどうか
   */
  isSaving?: boolean;
  /**
   * 自動フォーカス
   */
  autoFocus?: boolean;
};

/**
 * テキスト入力用のインライン編集フィールド（入力＋保存/キャンセルボタン）
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
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        maxLength={maxLength}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={isSaving}
      />
      <InlineEditControls
        onSave={onSave}
        onCancel={onCancel}
        isSaving={isSaving}
      />
    </div>
  );
}

type InlineEditDisplayProps = {
  /**
   * 表示する値
   */
  children: ReactNode;
  /**
   * 編集ボタンを表示するか
   */
  showEditButton?: boolean;
  /**
   * 編集ボタンのクリックハンドラー
   */
  onEdit?: () => void;
};

/**
 * 値の表示＋編集ボタン
 */
export function InlineEditDisplay({
  children,
  showEditButton = true,
  onEdit,
}: InlineEditDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      {children}
      {showEditButton && onEdit && <InlineEditButton onClick={onEdit} />}
    </div>
  );
}
