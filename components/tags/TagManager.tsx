"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useFormDialog } from "@/hooks/useFormDialog";
import { getTagColorClasses } from "@/lib/tagColors";
import { TagForm } from "./TagForm";

type Tag = {
  _id: Id<"tags">;
  name: string;
  color: string;
};

type TagManagerProps = {
  groupId: Id<"groups">;
};

type EditingTag = {
  _id: Id<"tags">;
  name: string;
  color: string;
};

function SortableTagItem({
  tag,
  onEdit,
  onDelete,
}: {
  tag: Tag;
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
  } = useSortable({ id: tag._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colors = getTagColorClasses(tag.color);

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
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm ${colors.bg} ${colors.text} border ${colors.border}`}
      >
        #{tag.name}
      </span>
      <div className="flex-1" />
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
    </div>
  );
}

function DeleteTagDialog({
  tag,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  tag: EditingTag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usageData = useQuery((api as any).tags.getUsageCount, {
    tagId: tag._id,
  }) as { usageCount: number } | undefined;

  const colors = getTagColorClasses(tag.color);

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="タグを削除"
      description={
        usageData && usageData.usageCount > 0
          ? `このタグは ${usageData.usageCount} 件の支出で使用されています。削除すると紐付きが解除されます。`
          : "このタグを削除してもよろしいですか？"
      }
      onConfirm={onConfirm}
      isLoading={isDeleting}
      confirmLabel="削除する"
    >
      <div className="py-4">
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm ${colors.bg} ${colors.text} border ${colors.border}`}
          >
            #{tag.name}
          </span>
        </div>
      </div>
    </ConfirmationDialog>
  );
}

export function TagManager({ groupId }: TagManagerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = useQuery((api as any).tags.list, { groupId }) as
    | Tag[]
    | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createTag = useMutation((api as any).tags.create);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateTag = useMutation((api as any).tags.update);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const removeTag = useMutation((api as any).tags.remove);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reorderTags = useMutation((api as any).tags.reorder);

  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null);
  const [deletingTag, setDeletingTag] = useState<EditingTag | null>(null);

  const { open, handleOpenChange, isLoading, error, setError, execute } =
    useFormDialog({
      onReset: () => {
        setMode("list");
        setEditingTag(null);
      },
    });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!tags) return;
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tags.findIndex((t) => t._id === active.id);
      const newIndex = tags.findIndex((t) => t._id === over.id);
      const newOrder = arrayMove(tags, oldIndex, newIndex);
      const tagIds = newOrder.map((t) => t._id);
      await reorderTags({ groupId, tagIds });
    }
  };

  const handleCreate = async (name: string, color: string) => {
    await execute(() => createTag({ groupId, name, color }), {
      closeOnSuccess: false,
    });
    setMode("list");
  };

  const handleUpdate = async (name: string, color: string) => {
    if (!editingTag) return;
    await execute(() => updateTag({ tagId: editingTag._id, name, color }), {
      closeOnSuccess: false,
    });
    setMode("list");
    setEditingTag(null);
  };

  const handleDelete = async () => {
    if (!deletingTag) return;
    const result = await execute(() => removeTag({ tagId: deletingTag._id }), {
      closeOnSuccess: false,
    });
    if (result.success) {
      setDeletingTag(null);
    } else if (result.error) {
      setError(result.error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            タグ管理
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "list" && "タグ管理"}
              {mode === "create" && "タグを追加"}
              {mode === "edit" && "タグを編集"}
            </DialogTitle>
          </DialogHeader>

          {mode === "list" && (
            <div className="space-y-4">
              <ErrorAlert message={error} className="p-2 rounded border-0" />

              {tags && tags.length > 0 ? (
                <>
                  <p className="text-xs text-slate-500">
                    ドラッグして並び替えできます
                  </p>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={tags.map((t) => t._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1">
                        {tags.map((tag) => (
                          <SortableTagItem
                            key={tag._id}
                            tag={tag}
                            onEdit={() => {
                              setEditingTag(tag);
                              setMode("edit");
                            }}
                            onDelete={() => setDeletingTag(tag)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  タグはまだありません
                </p>
              )}

              <Button
                className="w-full"
                variant="outline"
                onClick={() => setMode("create")}
              >
                + タグを追加
              </Button>
            </div>
          )}

          {mode === "create" && (
            <TagForm
              mode="create"
              onSubmit={handleCreate}
              onCancel={() => setMode("list")}
              isLoading={isLoading}
            />
          )}

          {mode === "edit" && editingTag && (
            <TagForm
              mode="edit"
              initialName={editingTag.name}
              initialColor={editingTag.color}
              onSubmit={handleUpdate}
              onCancel={() => {
                setMode("list");
                setEditingTag(null);
              }}
              isLoading={isLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {deletingTag && (
        <DeleteTagDialog
          tag={deletingTag}
          open={!!deletingTag}
          onOpenChange={(open) => !open && setDeletingTag(null)}
          onConfirm={handleDelete}
          isDeleting={isLoading}
        />
      )}
    </>
  );
}
