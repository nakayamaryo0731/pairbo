"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "./CategoryForm";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

type Category = {
  _id: Id<"categories">;
  name: string;
  icon: string;
  isPreset: boolean;
};

type CategoryManagerProps = {
  groupId: Id<"groups">;
  categories: Category[];
};

type EditingCategory = {
  _id: Id<"categories">;
  name: string;
  icon: string;
};

export function CategoryManager({ groupId, categories }: CategoryManagerProps) {
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const removeCategory = useMutation(api.categories.remove);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingCategory, setEditingCategory] =
    useState<EditingCategory | null>(null);
  const [deletingCategory, setDeletingCategory] =
    useState<EditingCategory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetCategories = categories.filter((c) => c.isPreset);
  const customCategories = categories.filter((c) => !c.isPreset);

  const handleCreate = async (name: string, icon: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await createCategory({ groupId, name, icon });
      setMode("list");
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (name: string, icon: string) => {
    if (!editingCategory) return;
    setIsLoading(true);
    setError(null);
    try {
      await updateCategory({ categoryId: editingCategory._id, name, icon });
      setMode("list");
      setEditingCategory(null);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsLoading(true);
    setError(null);
    try {
      await removeCategory({ categoryId: deletingCategory._id });
      setDeletingCategory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setMode("list");
      setEditingCategory(null);
      setError(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            カテゴリ管理
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "list" && "カテゴリ管理"}
              {mode === "create" && "カテゴリを追加"}
              {mode === "edit" && "カテゴリを編集"}
            </DialogTitle>
          </DialogHeader>

          {mode === "list" && (
            <div className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </p>
              )}

              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">
                  プリセット
                </h3>
                <div className="space-y-1">
                  {presetCategories.map((category) => (
                    <div
                      key={category._id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-50"
                    >
                      <span className="text-lg">{category.icon}</span>
                      <span className="flex-1">{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {customCategories.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">
                    カスタム
                  </h3>
                  <div className="space-y-1">
                    {customCategories.map((category) => (
                      <div
                        key={category._id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50"
                      >
                        <span className="text-lg">{category.icon}</span>
                        <span className="flex-1">{category.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(category);
                            setMode("edit");
                          }}
                        >
                          編集
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeletingCategory(category)}
                        >
                          削除
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                variant="outline"
                onClick={() => setMode("create")}
              >
                + カテゴリを追加
              </Button>
            </div>
          )}

          {mode === "create" && (
            <CategoryForm
              mode="create"
              onSubmit={handleCreate}
              onCancel={() => setMode("list")}
              isLoading={isLoading}
            />
          )}

          {mode === "edit" && editingCategory && (
            <CategoryForm
              mode="edit"
              initialName={editingCategory.name}
              initialIcon={editingCategory.icon}
              onSubmit={handleUpdate}
              onCancel={() => {
                setMode("list");
                setEditingCategory(null);
              }}
              isLoading={isLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {deletingCategory && (
        <DeleteCategoryDialog
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
          category={deletingCategory}
          onConfirm={handleDelete}
          isDeleting={isLoading}
        />
      )}
    </>
  );
}
