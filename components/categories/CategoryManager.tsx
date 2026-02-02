"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
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
import { useFormDialog } from "@/hooks/useFormDialog";

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

function SortableCategoryItem({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 bg-white"
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-lg">{category.icon}</span>
      <span className="flex-1">{category.name}</span>
      {!category.isPreset && (
        <>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            編集
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onDelete}
          >
            削除
          </Button>
        </>
      )}
    </div>
  );
}

export function CategoryManager({ groupId, categories }: CategoryManagerProps) {
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const removeCategory = useMutation(api.categories.remove);
  const reorderCategories = useMutation(api.categories.reorder);

  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingCategory, setEditingCategory] =
    useState<EditingCategory | null>(null);
  const [deletingCategory, setDeletingCategory] =
    useState<EditingCategory | null>(null);

  const { open, handleOpenChange, isLoading, error, setError, execute } =
    useFormDialog({
      onReset: () => {
        setMode("list");
        setEditingCategory(null);
      },
    });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c._id === active.id);
      const newIndex = categories.findIndex((c) => c._id === over.id);

      const newOrder = arrayMove(categories, oldIndex, newIndex);
      const categoryIds = newOrder.map((c) => c._id);

      await reorderCategories({ groupId, categoryIds });
    }
  };

  const handleCreate = async (name: string, icon: string) => {
    await execute(() => createCategory({ groupId, name, icon }), {
      closeOnSuccess: false,
    });
    setMode("list");
  };

  const handleUpdate = async (name: string, icon: string) => {
    if (!editingCategory) return;
    await execute(
      () => updateCategory({ categoryId: editingCategory._id, name, icon }),
      { closeOnSuccess: false },
    );
    setMode("list");
    setEditingCategory(null);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    const result = await execute(
      () => removeCategory({ categoryId: deletingCategory._id }),
      { closeOnSuccess: false },
    );
    if (result.success) {
      setDeletingCategory(null);
    } else if (result.error) {
      setError(result.error);
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

              <p className="text-xs text-slate-500">
                ドラッグして並び替えできます
              </p>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categories.map((c) => c._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {categories.map((category) => (
                      <SortableCategoryItem
                        key={category._id}
                        category={category}
                        onEdit={() => {
                          setEditingCategory(category);
                          setMode("edit");
                        }}
                        onDelete={() => setDeletingCategory(category)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

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
