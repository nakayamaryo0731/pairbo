"use client";

import { MoreVertical, Pencil, Trash2, Settings, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GroupCardProps = {
  name: string;
  memberCount: number;
  myRole: "owner" | "member";
  isDefault?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
  onSetDefault?: () => void;
};

export function GroupCard({
  name,
  memberCount,
  myRole,
  isDefault,
  onClick,
  onEdit,
  onDelete,
  onSettings,
  onSetDefault,
}: GroupCardProps) {
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all">
      <button onClick={onClick} className="flex-1 text-left p-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{name}</span>
          {isDefault && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              デフォルト
            </span>
          )}
        </div>
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
          <DropdownMenuItem onClick={onSetDefault}>
            <Star
              className={`h-4 w-4 mr-2 ${isDefault ? "fill-current text-yellow-500" : ""}`}
            />
            {isDefault ? "デフォルトを解除" : "デフォルトに設定"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
