"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { REVIEW_RULES } from "@/convex/domain/review";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { trackEvent } from "@/lib/analytics";
import { getErrorMessage } from "@/lib/errors";
import { Check } from "lucide-react";

type Relationship = "cohabiting" | "married" | "other";
type AgeRange = "20s" | "30s" | "40s_plus";

const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: "cohabiting", label: "同棲カップル" },
  { value: "married", label: "夫婦" },
  { value: "other", label: "その他" },
];

const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s_plus", label: "40代以上" },
];

type Form = {
  relationship: Relationship | null;
  ageRange: AgeRange | null;
  before: string;
  change: string;
  likes: string;
  improvements: string;
  publishConsent: boolean;
};

const INITIAL_FORM: Form = {
  relationship: null,
  ageRange: null,
  before: "",
  change: "",
  likes: "",
  improvements: "",
  publishConsent: false,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * 感想の回答フォーム
 *
 * 誤って閉じても書きかけの内容を失わないよう、閉じても入力はリセットしない
 */
export function ReviewDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState<Form>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submitReview = useMutation(api.reviews.submit);

  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit =
    form.relationship !== null &&
    form.before.trim() !== "" &&
    form.change.trim() !== "" &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || form.relationship === null) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await submitReview({
        relationship: form.relationship,
        ageRange: form.ageRange ?? undefined,
        before: form.before,
        change: form.change,
        likes: form.likes,
        improvements: form.improvements,
        publishConsent: form.publishConsent,
      });
      setSent(true);
      trackEvent("submit_review", { publishConsent: form.publishConsent });
    } catch (err) {
      setError(getErrorMessage(err, "送信に失敗しました"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-800">
                ありがとうございました
              </p>
              <p className="text-sm text-slate-500 mt-1">
                いただいた感想は、Pairboの改善に役立てます。
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="mt-2"
            >
              閉じる
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pairboの感想を聞かせてください</DialogTitle>
              <DialogDescription>
                いただいた感想は、Pairboの改善に役立てます。
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <ErrorAlert message={error} className="rounded-md" />

              <div className="space-y-2">
                <Label>ふたりの関係 *</Label>
                <ChoiceGroup
                  options={RELATIONSHIPS}
                  value={form.relationship}
                  onChange={(value) => update("relationship", value)}
                />
              </div>

              <div className="space-y-2">
                <Label>年代（任意）</Label>
                <ChoiceGroup
                  options={AGE_RANGES}
                  value={form.ageRange}
                  onChange={(value) => update("ageRange", value)}
                  allowDeselect
                />
              </div>

              <TextField
                id="review-before"
                label="Pairboを使う前は、ふたりのお金をどう分けていましたか？"
                required
                value={form.before}
                onChange={(value) => update("before", value)}
              />
              <TextField
                id="review-change"
                label="Pairboを使って、何が変わりましたか？"
                required
                value={form.change}
                onChange={(value) => update("change", value)}
              />
              <TextField
                id="review-likes"
                label="Pairboの気に入っているところ"
                value={form.likes}
                onChange={(value) => update("likes", value)}
              />
              <TextField
                id="review-improvements"
                label="改善してほしいところ"
                value={form.improvements}
                onChange={(value) => update("improvements", value)}
              />

              <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={form.publishConsent}
                  onChange={(e) => update("publishConsent", e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-slate-800"
                />
                <span className="text-sm text-slate-700">
                  回答をPairboのWebサイトに掲載してもよい
                  <span className="block mt-1 text-xs text-slate-500">
                    名前は載せません。意味を変えない範囲で文章を短くすることがあります。掲載をやめたい場合は、お問い合わせからご連絡ください。
                  </span>
                </span>
              </label>

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {isSubmitting ? "送信中..." : "送信する"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  allowDeselect = false,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  allowDeselect?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              onChange(selected && allowDeselect ? null : option.value)
            }
            className={`rounded-lg border px-2 py-2.5 text-sm transition-colors ${
              selected
                ? "border-slate-800 bg-slate-50 text-slate-800"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function TextField({
  id,
  label,
  required = false,
  value,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="leading-snug">
        {label}
        {required ? " *" : "（任意）"}
      </Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={REVIEW_RULES.TEXT_MAX_LENGTH}
        rows={3}
        className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
