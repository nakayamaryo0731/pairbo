"use client";

import { useState, useCallback } from "react";

type UseInlineEditOptions<T> = {
  /**
   * 初期値
   */
  initialValue: T;
  /**
   * 保存処理（成功時にtrue、失敗時にfalse）
   */
  onSave: (value: T) => Promise<void>;
  /**
   * バリデーション（falseを返すと保存しない）
   */
  validate?: (value: T) => boolean;
};

type UseInlineEditReturn<T> = {
  /**
   * 編集中かどうか
   */
  isEditing: boolean;
  /**
   * 現在の値
   */
  value: T;
  /**
   * 値を更新
   */
  setValue: (value: T) => void;
  /**
   * 保存中かどうか
   */
  isSaving: boolean;
  /**
   * 編集モードを開始
   */
  startEditing: () => void;
  /**
   * 編集をキャンセル（値をリセット）
   */
  cancelEditing: () => void;
  /**
   * 保存を実行
   */
  save: () => Promise<void>;
  /**
   * 元の値にリセット
   */
  resetValue: (newInitialValue: T) => void;
};

export function useInlineEdit<T>({
  initialValue,
  onSave,
  validate,
}: UseInlineEditOptions<T>): UseInlineEditReturn<T> {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<T>(initialValue);
  const [savedValue, setSavedValue] = useState<T>(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setValue(savedValue);
    setIsEditing(false);
  }, [savedValue]);

  const save = useCallback(async () => {
    if (validate && !validate(value)) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(value);
      setSavedValue(value);
      setIsEditing(false);
    } catch {
      // エラー時は元の値に戻す
      setValue(savedValue);
    } finally {
      setIsSaving(false);
    }
  }, [value, savedValue, onSave, validate]);

  const resetValue = useCallback((newInitialValue: T) => {
    setValue(newInitialValue);
    setSavedValue(newInitialValue);
  }, []);

  return {
    isEditing,
    value,
    setValue,
    isSaving,
    startEditing,
    cancelEditing,
    save,
    resetValue,
  };
}
