// src/app/xin-xam/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type TopicKey = "tien" | "tiem" | "tinh" | "ban-than";

const TOPIC_LABELS: Record<TopicKey, string> = {
  tien: "Tiền",
  tiem: "Tiệm",
  tinh: "Tình",
  "ban-than": "Bản thân",
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
  period_kind: "day" | "week";
  period: string; // YYYY-MM-DD or YYYY-WW
  category: "TIEN" | "TIEM" | "TINH" | "BAN_THAN";
  stick: XinXamStick;
  draw_index: number;
  refresh_remaining: 0 | 1;
  message?: string;
};

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

function getOrCreateVisitorId(): string {
  try {
    const key = "od_vid";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const v =
      globalThis.crypto?.randomUUID?.() ??
      `vid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, v);
    return v;
  } catch {
    return "dev";
  }
}

type TopicLock = { period_kind: "day" | "week"; period: string; topic: TopicKey };
const TOPIC_LOCK_KEY = "xinXam.topicLock.v2";

export default function XinXamPage() {
  // Strong default: if env missing, use prod API
  const base =
    (process.env.NEXT_PUBLIC_OD_BASE && process.env.NEXT_PUBLIC_OD_BASE.trim()) ||
    "https://api.vikami.ca";

  const [selectedTopic, setSelectedTopic] = useState<TopicKey | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [xx, setXx] = useState<XinXamResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Dev gate: only show reset tools if URL has ?dev=1
  const [showDev, setShowDev] = useState(false);
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setShowDev(sp.get("dev") === "1" || sp.has("dev"));
    } catch {
      setShowDev(false);
    }
  }, []);

  // Load last topic lock (optional)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOPIC_LOCK_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TopicLock;
      if (parsed?.topic) setSelectedTopic(parsed.topic);
    } catch {
      // ignore
    }
  }, []);

  /**
   * IMPORTANT:
   *  - Send topic using `topic=` (NOT `cat=`).
   *  - Use POST for draw + refresh to avoid caching weirdness.
   */
  async function callWorker(path: "/xin-xam/draw" | "/xin-xam/refresh", topic: TopicKey) {
    if (!base) throw new Error("Missing NEXT_PUBLIC_OD_BASE");
    const visitorId = getOrCreateVisitorId();

    const url =
      `${base}${path}` +
      `?visitor_id=${encodeURIComponent(visitorId)}` +
      `&topic=${encodeURIComponent(topic)}`;

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

  const handleConfirm = async () => {
    if (!selectedTopic) return;
    setConfirmed(true);
    setErr(null);
    setLoading(true);

    try {
      const out = await callWorker("/xin-xam/draw", selectedTopic);
      setXx(out);

      // lock topic for this period (day/week depending on lane)
      try {
        localStorage.setItem(
          TOPIC_LOCK_KEY,
          JSON.stringify({
            period_kind: out.period_kind,
            period: out.period,
            topic: selectedTopic,
          } satisfies TopicLock)
        );
      } catch {
        // ignore
      }
    } catch (e: any) {
      setErr(e?.message ?? "Xin Xăm bị nghẽn.");
      setXx(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedTopic) return;
    setErr(null);
    setLoading(true);
    try {
      const out = await callWorker("/xin-xam/refresh", selectedTopic);
      setXx(out);
    } catch (e: any) {
      setErr(e?.message ?? "Xin Xăm bị nghẽn.");
    } finally {
      setLoading(false);
    }
  };

  // DEV: reset lock + identity so you can re-draw without waiting day/week
  const resetLocalXinXam = () => {
    try {
      localStorage.removeItem(TOPIC_LOCK_KEY);
      localStorage.removeItem("od_vid");
    } catch {
      // ignore
    }
    setConfirmed(false);
    setXx(null);
    setErr(null);
    setLoading(false);
  };

  const refreshDisabled = loading || (xx?.refresh_remaining ?? 1) === 0;

  // If worker period differs from local lock period, unlock topic automatically
  useEffect(() => {
    if (!xx?.period) return;
    try {
      const raw = localStorage.getItem(TOPIC_LOCK_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TopicLock;
      if (parsed?.period && parsed.period !== xx.period) {
        localStorage.removeItem(TOPIC_LOCK_KEY);
      }
    } catch {
      // ignore
    }
  }, [xx?.period]);

  const topicHint = useMemo(() => {
    if (!selectedTopic) return null;
    return (
      <p className="mt-2 text-xs text-amber-800/90">
        {xx?.period_kind === "day" ? "Hôm nay" : "Tuần này"} xin xăm về{" "}
        <span className="font-semibold">{TOPIC_LABELS[selectedTopic]}</span>. Đừng ôm thêm
        chuyện khác vô chung.
      </p>
    );
  }, [selectedTopic, xx?.period_kind]);

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Top nav / back */}
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/"
            className="text-sm text-amber-800 hover:text-amber-900 underline-offset-2 hover:underline"
          >
            ← Về Chợ Neo
          </Link>
          <span className="text-xs uppercase tracking-wide text-amber-700">
            Xin xăm
            {showDev && (
              <span className="text-[10px] px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-900">
                DEV ON
            </span>
            )}
          </span>
        </div>

        {/* Title + hero */}
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <Image
              src="/Xin-Xam.png"
              alt="Xin Xăm"
              width={80}
              height={80}
              className="h-20 w-20 object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-amber-950">Xin Xăm</h1>
            <p className="mt-1 text-sm text-amber-800">
              Không phải bói cho vui. Chỉ là ngồi lại một chút cho lòng bớt rối, rồi mới
              tính đường đi tiếp.
            </p>
          </div>
        </div>

        {/* 1. Trước khi xin xăm */}
        <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-900">Trước khi xin xăm</h2>
          <p className="text-sm text-amber-900">Hít thở chậm một nhịp. Nghĩ rõ trong đầu:</p>
          <ul className="list-disc list-inside text-sm text-amber-900 space-y-1">
            <li>Một chuyện muốn hỏi, không phải mười chuyện.</li>
            <li>Mình muốn nghe sự thật nhẹ nhàng, không phải lời khen cho sướng.</li>
            <li>Xin xăm để rõ đường, không phải để trốn trách nhiệm.</li>
          </ul>
          <p className="text-xs text-amber-800/80">Khi lòng bớt gấp, xăm mới nói trúng.</p>
        </section>

        {/* 2. Chủ đề xin xăm */}
        <section className="rounded-2xl border border-amber-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-900">Chọn chủ đề</h2>
          <p className="text-xs text-amber-800/80">
            Chỉ chọn <span className="font-semibold">một</span> chủ đề. Tình/Bản thân là quẻ{" "}
            <span className="font-semibold">theo ngày</span>. Tiền/Tiệm là quẻ{" "}
            <span className="font-semibold">theo tuần</span>.
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            {(Object.keys(TOPIC_LABELS) as TopicKey[]).map((key) => {
              const isActive = selectedTopic === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedTopic(key);
                    setConfirmed(false);
                    setXx(null);
                    setErr(null);
                  }}
                  className={[
                    "px-3 py-1.5 rounded-full border text-sm transition",
                    "focus:outline-none focus:ring-2 focus:ring-amber-500/60",
                    isActive
                      ? "bg-amber-900 text-amber-50 border-amber-900 shadow-sm"
                      : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
                  ].join(" ")}
                >
                  {TOPIC_LABELS[key]}
                </button>
              );
            })}
          </div>

          {topicHint}
        </section>

        {/* 3. Warning + confirm */}
        <section className="rounded-2xl border border-amber-100 bg-amber-900 text-amber-50 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Ông Địa nhắc nhẹ</h2>
          <p className="text-sm">
            Đừng xin tới xin lui mỗi lần thấy bất an. Xin xăm xong thì chịu khó làm phần của mình nữa.
          </p>
          <p className="text-xs text-amber-100/80">
            Nếu cảm thấy không nghe nổi sự thật, để mai/tuần sau rồi xin. Không sao hết.
          </p>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-amber-100/90">Khi sẵn sàng, bấm nút. Mỗi kỳ chỉ có 1 lần đổi.</p>

            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!selectedTopic || loading}
              className={[
                "px-4 py-2 rounded-full text-sm font-medium transition",
                !selectedTopic || loading
                  ? "bg-amber-700/60 text-amber-100 cursor-not-allowed"
                  : "bg-amber-50 text-amber-900 hover:bg-white shadow-sm",
              ].join(" ")}
            >
              {selectedTopic ? "Đã hiểu, cho em xin xăm" : "Chọn chủ đề trước nha"}
            </button>
          </div>

          {err && <div className="text-xs text-amber-100/90">Lỗi: {err}</div>}
        </section>

        {/* 4. Result */}
        {confirmed && (
          <section className="rounded-2xl border border-amber-100 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-700">
                  {xx?.period_kind === "day" ? "Quẻ hôm nay" : "Quẻ tuần này"}
                </p>

                {loading && <div className="text-sm text-amber-900">Đang xin quẻ…</div>}

                {!loading && xx && (
                  <h2 className="text-sm font-semibold text-amber-950">{xx.stick.title}</h2>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {xx?.period && (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                    {xx.period_kind === "week" ? `Tuần ${xx.period}` : `Ngày ${xx.period}`}
                  </span>
                )}
                {xx?.stick?.luck && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${luckClasses(
                      xx.stick.luck
                    )}`}
                  >
                    {luckLabel(xx.stick.luck)}
                  </span>
                )}
                {xx?.stick?.no && (
                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700">
                    Số {xx.stick.no}
                  </span>
                )}
                {selectedTopic && (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                    Chủ đề: {TOPIC_LABELS[selectedTopic]}
                  </span>
                )}
              </div>
            </div>

            {!loading && xx && (
              <>
                <div className="space-y-2 text-sm text-amber-900">
                  <p className="italic whitespace-pre-line">{xx.stick.poem}</p>
                  <p>{xx.stick.meaning}</p>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    disabled={refreshDisabled}
                    className={[
                      "px-3 py-2 rounded-xl text-xs border border-zinc-200 bg-white hover:bg-zinc-50",
                      refreshDisabled ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    Đổi quẻ (1 lần)
                  </button>

                  {showDev && (
                    <button
                      type="button"
                      onClick={resetLocalXinXam}
                      className="px-3 py-2 rounded-xl text-xs border border-zinc-200 bg-white hover:bg-zinc-50"
                      title="Chỉ dùng để test: xoá lock + đổi visitor_id"
                    >
                      Reset (dev)
                    </button>
                  )}

                  <div className="text-[11px] text-zinc-500">
                    {xx.refresh_remaining === 0 ? "Kỳ này hết đổi." : "Còn _1 lần đổi kỳ này."}
                  </div>
                </div>

                {xx.message && <div className="text-xs text-amber-800/90">{xx.message}</div>}

                <p className="text-[11px] text-amber-700/80">
                  Xăm chỉ nhắc đường. Còn đi đường nào, quay lại lúc nào – là quyền của mình.
                </p>
              </>
            )}

            {!loading && !xx && (
              <div className="text-sm text-amber-900">Chưa xin được quẻ. Thử bấm lại.</div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
