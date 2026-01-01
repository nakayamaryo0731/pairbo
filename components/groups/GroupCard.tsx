"use client";

import { MoreVertical, Pencil, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GroupCardProps = {
  name: string;
  memberCount: number;
  myRole: "owner" | "member";
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
};

export function GroupCard({
  name,
  memberCount,
  myRole,
  onClick,
  onEdit,
  onDelete,
  onSettings,
}: GroupCardProps) {
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all">
      <button onClick={onClick} className="flex-1 text-left p-4">
        <div className="font-medium text-slate-800">{name}</div>
        <div className="text-sm text-slate-500 mt-1">
          メンバー: {memberCount}人 |{" "}
          {myRole === "owner" ? "オーナー" : "メンバー"}
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mr-2"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">メニュー</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            編集
          </DropdownMenuItem>
          {myRole === "owner" && (
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              削除
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onSettings}>
            <Settings className="h-4 w-4 mr-2" />
            設定
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
