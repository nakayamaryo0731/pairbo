"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { phrases } from "./phrases";

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#F2E7EA] bg-white">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <span className="text-sm font-bold text-[#43373C]">{phrases(q)}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#EE6B8D] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-[#6E6167]">{a}</div>}
    </div>
  );
}
