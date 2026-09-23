"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table as TanstackTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const PAGE_SIZE_OPTIONS = [10, 30, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

type PlanFilter = "all" | "free" | "premium";

// TanStack Table の ColumnMeta を拡張し、列ごとの揃え設定を型安全に保持する
// （公式の augmentation パターン: https://tanstack.com/table/v8/docs/api/core/column-def#meta）
// TS が元 interface と完全一致する型パラメータ名を要求するため TData/TValue を残す必要があり、
// その結果 ESLint が unused-vars を報告するので、その1行だけ抑止する
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right";
  }
}

export default function AdminDashboard() {
  const summary = useQuery(api.admin.getSummary);
  const users = useQuery(api.admin.getUsers);
  const groups = useQuery(api.admin.getGroups);
  const inquiries = useQuery(api.admin.getInquiries);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">
            Pairbo Admin Dashboard
          </h1>
          <Link
            href="/groups"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← アプリに戻る
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        <SummaryCards summary={summary} />
        <InquiryList inquiries={inquiries} />
        <UserTable users={users} />
        <GroupTable groups={groups} />
      </main>
    </div>
  );
}

/* ========== Summary Cards ========== */

type Summary = {
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  totalGroups: number;
  totalExpenses: number;
  premiumCount: number;
  inquiryCount7d: number;
};

function SummaryCards({ summary }: { summary: Summary | undefined }) {
  const cards = summary
    ? [
        { label: "総ユーザー", value: summary.totalUsers },
        { label: "DAU", value: summary.dau },
        { label: "WAU", value: summary.wau },
        { label: "MAU", value: summary.mau },
        { label: "グループ数", value: summary.totalGroups },
        { label: "支出件数", value: summary.totalExpenses.toLocaleString() },
        { label: "Premium", value: summary.premiumCount },
        { label: "問い合わせ（7日）", value: summary.inquiryCount7d },
      ]
    : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
      {cards
        ? cards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-lg border border-slate-200 p-4"
            >
              <p className="text-xs text-slate-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            </div>
          ))
        : Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-slate-200 p-4"
            >
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
    </div>
  );
}

/* ========== Inquiry List ========== */

type InquiryRow = {
  _id: string;
  category: "feature_request" | "bug_report" | "other";
  body: string;
  createdAt: number;
  displayName: string;
};

const INQUIRY_CATEGORY_LABELS: Record<
  InquiryRow["category"],
  { label: string; className: string }
> = {
  feature_request: {
    label: "機能要望",
    className: "bg-blue-100 text-blue-700",
  },
  bug_report: { label: "不具合", className: "bg-red-100 text-red-700" },
  other: { label: "その他", className: "bg-slate-100 text-slate-600" },
};

function InquiryList({ inquiries }: { inquiries: InquiryRow[] | undefined }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-800 mb-3">
        問い合わせ（直近7日）
        {inquiries && (
          <span className="text-sm font-normal text-slate-500 ml-2">
            ({inquiries.length}件)
          </span>
        )}
      </h2>
      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {inquiries === undefined ? (
          <div className="px-4 py-8 text-center">
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        ) : inquiries.length === 0 ? (
          <p className="px-4 py-8 text-center text-slate-500">
            直近7日の問い合わせはありません
          </p>
        ) : (
          inquiries.map((inquiry) => {
            const category = INQUIRY_CATEGORY_LABELS[inquiry.category];
            return (
              <div key={inquiry._id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${category.className}`}
                  >
                    {category.label}
                  </span>
                  <span className="text-sm text-slate-600">
                    {inquiry.displayName}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {formatDate(inquiry.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {inquiry.body}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/* ========== User Table ========== */

type UserRow = {
  _id: string;
  displayName: string;
  createdAt: number;
  plan: string;
  groupCount: number;
  expenseCount: number;
  lastActivity: number | null;
};

const USER_COLUMNS: ColumnDef<UserRow>[] = [
  {
    accessorKey: "displayName",
    header: "表示名",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-slate-800">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "登録日",
    cell: ({ getValue }) => (
      <span className="text-slate-600">{formatDate(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "plan",
    header: "プラン",
    enableSorting: false,
    cell: ({ getValue }) => <PlanBadge plan={getValue<string>()} />,
    filterFn: (row, _id, value: string) => row.getValue("plan") === value,
  },
  {
    accessorKey: "groupCount",
    header: "グループ",
    enableSorting: false,
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-slate-600">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: "expenseCount",
    header: "支出数",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-slate-600">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: "lastActivity",
    header: "最終活動",
    cell: ({ getValue }) => {
      const v = getValue<number | null>();
      return <span className="text-slate-600">{v ? formatDate(v) : "—"}</span>;
    },
    // null は方向に関わらず常に末尾
    sortingFn: (a, b) => {
      const av = a.getValue<number | null>("lastActivity");
      const bv = b.getValue<number | null>("lastActivity");
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return av - bv;
    },
  },
];

function UserTable({ users }: { users: UserRow[] | undefined }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const data = useMemo(() => users ?? [], [users]);

  const table = useReactTable({
    data,
    columns: USER_COLUMNS,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
  });

  const planColumn = table.getColumn("plan");
  const planFilter = (planColumn?.getFilterValue() as PlanFilter) ?? "all";
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <section>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <h2 className="text-lg font-bold text-slate-800">
          ユーザー一覧
          {users && (
            <span className="text-sm font-normal text-slate-500 ml-2">
              {planFilter === "all"
                ? `(${users.length}件)`
                : `(${filteredCount}件 / 全${users.length}件)`}
            </span>
          )}
        </h2>
        <PlanFilterControl
          value={planFilter}
          onChange={(next) =>
            planColumn?.setFilterValue(next === "all" ? undefined : next)
          }
        />
      </div>
      <DataTable
        table={table}
        isLoading={users === undefined}
        emptyMessage="該当するユーザーがいません"
      />
    </section>
  );
}

function PlanFilterControl({
  value,
  onChange,
}: {
  value: PlanFilter;
  onChange: (next: PlanFilter) => void;
}) {
  const options: { value: PlanFilter; label: string }[] = [
    { value: "all", label: "すべて" },
    { value: "free", label: "Free" },
    { value: "premium", label: "Premium" },
  ];
  return (
    <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === opt.value
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ========== Group Table ========== */

type GroupRow = {
  _id: string;
  name: string;
  createdAt: number;
  memberCount: number;
  expenseCount: number;
  totalAmount: number;
};

const GROUP_COLUMNS: ColumnDef<GroupRow>[] = [
  {
    accessorKey: "name",
    header: "グループ名",
    cell: ({ getValue }) => (
      <span className="text-slate-800">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: "memberCount",
    header: "メンバー",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-slate-600">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: "expenseCount",
    header: "支出件数",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-slate-600">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "総支出額",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-slate-600">
        ¥{getValue<number>().toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "作成日",
    cell: ({ getValue }) => (
      <span className="text-slate-600">{formatDate(getValue<number>())}</span>
    ),
  },
];

function GroupTable({ groups }: { groups: GroupRow[] | undefined }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const data = useMemo(() => groups ?? [], [groups]);

  const table = useReactTable({
    data,
    columns: GROUP_COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
  });

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-800 mb-3">
        グループ一覧
        {groups && (
          <span className="text-sm font-normal text-slate-500 ml-2">
            ({groups.length}件)
          </span>
        )}
      </h2>
      <DataTable
        table={table}
        isLoading={groups === undefined}
        emptyMessage="グループがありません"
      />
    </section>
  );
}

/* ========== DataTable (shared shell) ========== */

function DataTable<T>({
  table,
  isLoading,
  emptyMessage,
}: {
  table: TanstackTable<T>;
  isLoading: boolean;
  emptyMessage: string;
}) {
  const columnCount = table.getVisibleFlatColumns().length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-slate-200 bg-slate-50">
              {hg.headers.map((header) => {
                const align = header.column.columnDef.meta?.align ?? "left";
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                const headerContent = flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                );
                return (
                  <th
                    key={header.id}
                    className={`px-4 py-3 font-medium text-slate-600 ${align === "right" ? "text-right" : "text-left"}`}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={`inline-flex items-center gap-1 hover:text-slate-900 transition-colors ${align === "right" ? "ml-auto" : ""}`}
                      >
                        {headerContent}
                        {sortDir === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : sortDir === "desc" ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />
                        )}
                      </button>
                    ) : (
                      headerContent
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-8 text-center">
                <Skeleton className="h-4 w-48 mx-auto" />
              </td>
            </tr>
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-0"
              >
                {row.getVisibleCells().map((cell) => {
                  const align = cell.column.columnDef.meta?.align ?? "left";
                  return (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columnCount}
                className="px-4 py-8 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!isLoading && table.getFilteredRowModel().rows.length > 0 && (
        <DataTablePagination table={table} />
      )}
    </div>
  );
}

function DataTablePagination<T>({ table }: { table: TanstackTable<T> }) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap px-4 py-3 border-t border-slate-200">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <label htmlFor="page-size">表示件数:</label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500">
            {pageIndex + 1} / {pageCount} ページ
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== Helpers ========== */

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "premium") {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
        Premium
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
      Free
    </span>
  );
}
