// src/components/XinXamButton.tsx
"use client";

import { useMemo, useState } from "react";

type XinXamButtonProps = {
  className?: string;
};

type XinXamLuck = "DAI_CAT" | "CAT" | "BINH" | "HUNG";

type XinXamStick = {
  no: number;
  luck: XinXamLuck;
  title: string;
  poem: string;
  meaning: string;
};

type XinXamResponse = {
  week: string; // YYYY-WW
  stick: XinXamStick;
  refresh_remaining: 0 | 1;
  message?: string;
};

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem("od_vid");
    if (existing) return existing;
    const v =
      (globalThis.crypto?.randomUUID?.() ??
        `vid_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem("od_vid", v);
    return v;
  } catch {
    return "dev";
  }
}

function luckLabel(luck: XinXamLuck) {
  switch (luck) {
    case "DAI_CAT":
      return "Đại Cát";
    case "CAT":
      return "Cát";
    case "BINH":
      return "Bình";
    case "HUNG":
      return "Hung";
  }
}

function luckClasses(luck: XinXamLuck) {
  switch (luck) {
    case "DAI_CAT":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "CAT":
      return "bg-green-50 text-green-900 border-green-200";
    case "BINH":
      return "bg-zinc-50 text-zinc-800 border-zinc-200";
    case "HUNG":
      return "bg-rose-50 text-rose-900 border-rose-200";
  }
}

export function XinXamButton({ className = "" }: XinXamButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<XinXamResponse | null>(null);

  const base = useMemo(() => process.env.NEXT_PUBLIC_OD_BASE ?? "", []);

  async function call(path: "/xin-xam/draw" | "/xin-xam/refresh") {
    if (!base) throw new Error("Missing NEXT_PUBLIC_OD_BASE");
    const visitorId = getOrCreateVisitorId();
    const url = `${base}${path}?visitor_id=${encodeURIComponent(visitorId)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Xin Xăm API failed ${res.status}: ${text}`);
    }

    return (await res.json()) as XinXamResponse;
  }

  async function onOpenAndDraw() {
    setOpen(true);
    setErr(null);
    setLoading(true);
    try {
      const out = await call("/xin-xam/draw");
      setData(out);
    } catch (e: any) {
      setErr(e?.message ?? "Xin Xăm bị nghẽn.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setErr(null);
    setLoading(true);
    try {
      const out = await call("/xin-xam/refresh");
      setData(out);
    } catch (e: any) {
      setErr(e?.message ?? "Xin Xăm bị nghẽn.");
    } finally {
      setLoading(false);
    }
  }

  const refreshDisabled = loading || (data?.refresh_remaining ?? 1) === 0;

  return (
    <>
      <button
        onClick={() => void onOpenAndDraw()}
        className={`inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 ${className}`}
      >
        Xin xăm tuần này
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />

          {/* modal */}
          <div
            className="relative w-full md:max-w-lg rounded-t-2xl md:rounded-2xl bg-[#fbf7ef] border border-zinc-200 shadow-xl p-4 md:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-600 font-semibold">
                  Xin Xăm
                </div>
                <div className="text-sm text-zinc-600">
                  Mỗi tuần 1 quẻ. (Bạn có tối đa 1 lần đổi/tuần.)
                </div>
              </div>

              {/* ✅ keep actions grouped so layout never breaks */}
              <div className="flex gap-2">
                <a
                  href="/xin-xam"
                  className="text-xs px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
                >
                  Mở trang
                </a>

                <button
                  onClick={() => setOpen(false)}
                  className="text-xs px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="mt-4">
              {loading && (
                <div className="text-sm text-zinc-600">Đang xin quẻ…</div>
              )}

              {!loading && err && (
                <div className="text-sm text-rose-700">{err}</div>
              )}

              {!loading && !err && data && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full border border-zinc-200 bg-white text-zinc-700">
                      Tuần {data.week}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${luckClasses(
                        data.stick.luck
                      )}`}
                    >
                      {luckLabel(data.stick.luck)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Số {data.stick.no}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="text-base font-semibold text-zinc-900">
                      {data.stick.title}
                    </div>
                    <div className="mt-2 text-sm text-zinc-800 whitespace-pre-line">
                      {data.stick.poem}
                    </div>
                    <div className="mt-3 text-sm text-zinc-700">
                      {data.stick.meaning}
                    </div>
                  </div>

                  {data.message && (
                    <div className="text-xs text-zinc-600">{data.message}</div>
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => void onRefresh()}
                      disabled={refreshDisabled}
                      className={`text-xs px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 ${
                        refreshDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Đổi quẻ (1 lần)
                    </button>

                    <div className="text-[11px] text-zinc-500">
                      {data.refresh_remaining === 0
                        ? "Tuần này hết đổi."
                        : "Còn 1 lần đổi tuần này."}
                    </div>
                  </div>
                </div>
              )}

              {!loading && !err && !data && (
                <div className="text-sm text-zinc-600">
                  Bấm “Xin xăm tuần này” để xin quẻ.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
