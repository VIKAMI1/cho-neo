"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChoNeoBetaFeedback } from "@/components/cho-neo/ChoNeoBetaFeedback";
import { ChoNeoMeoVatEditor } from "@/components/cho-neo/ChoNeoMeoVatEditor";
import { useChoNeoMember } from "@/components/cho-neo/ChoNeoMemberProvider";
import { ChoNeoMobileVillageNav } from "@/components/cho-neo/ChoNeoMobileVillageNav";
import { ChoNeoRoomTopBar } from "@/components/cho-neo/ChoNeoRoomTopBar";
import { ChoNeoRoomShell } from "@/components/cho-neo/ChoNeoRoomShell";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";
import { ChoNeoVillageRail } from "@/components/cho-neo/ChoNeoVillageRail";
import {
  CHO_NEO_MEO_VAT_CATEGORIES,
  filterChoNeoMeoVatFeed,
  type ChoNeoMeoVatCategory,
  type ChoNeoMeoVatTip,
} from "@/lib/cho-neo/meo-vat";

export function ChoNeoMeoVatFeed({ mineOnly = false }: { mineOnly?: boolean }) {
  const { ensureChoNeoMember, openProfileSheet, profile, session } = useChoNeoMember();
  const [tips, setTips] = useState<ChoNeoMeoVatTip[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ChoNeoMeoVatCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [createdTipHref, setCreatedTipHref] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    setIsEmbedded(new URLSearchParams(window.location.search).get("embed") === "1");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/meo-vat${mineOnly ? "?mine=1" : ""}`, {
      cache: "no-store",
      headers: mineOnly && session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? "Chưa tải được Mẹo Vặt.");
        if (!cancelled) setTips(Array.isArray(payload?.tips) ? payload.tips : []);
      })
      .catch((error) => { if (!cancelled) setNotice(error instanceof Error ? error.message : "Chưa tải được Mẹo Vặt."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mineOnly, session?.access_token]);

  const visibleTips = useMemo(() => filterChoNeoMeoVatFeed(tips, selectedCategory, search, mineOnly), [tips, selectedCategory, search, mineOnly]);

  async function submitTip(input: { body: string; category: ChoNeoMeoVatCategory; title: string }) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/meo-vat", {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        method: "POST",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Chưa gửi được mẹo.");
      setIsComposerOpen(false);
      setCreatedTipHref(`/meo-vat/${result.id}`);
      setNotice("Mẹo đã được gửi vào hàng chờ xem lại.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa gửi được mẹo. Thử lại nha.");
    } finally {
      setBusy(false);
    }
  }

  function startWriting() {
    void ensureChoNeoMember(async () => {
      setIsComposerOpen(true);
      setNotice("");
    });
  }

  return <>
    <ChoNeoTimeAmbience />
    <ChoNeoRoomShell currentNavId="meo-vat" className="meo-vat-shell">
      <div className={`meo-vat-layout${isEmbedded ? " meo-vat-layout--embedded" : ""}`}>
        {!isEmbedded ? <ChoNeoVillageRail currentId="meo-vat" /> : null}
        <div className="meo-vat-content">
          {!isEmbedded ? <ChoNeoMobileVillageNav currentId="meo-vat" /> : null}
          {!isEmbedded ? <ChoNeoRoomTopBar ariaLabel="Mẹo Vặt controls" feedback={<ChoNeoBetaFeedback />} memberProfile={profile} onMemberClick={() => { void ensureChoNeoMember(async () => openProfileSheet()); }} /> : null}
          <header className="meo-vat-hero">
            <p className="meo-vat-eyebrow">Góc chia sẻ của Chợ Neo</p>
            <h1>{mineOnly ? "Mẹo của tôi" : "Mẹo Vặt"}</h1>
            <p>{mineOnly ? "Theo dõi những chia sẻ bạn đã gửi và mở bài để cập nhật hoặc xóa." : "Những kinh nghiệm nhỏ từ người trong nghề và cuộc sống Việt nơi xa nhà."}</p>
            {!mineOnly ? <button className="meo-vat-primary" onClick={startWriting} type="button">Chia sẻ một mẹo</button> : null}
          </header>

          {isComposerOpen ? <section className="meo-vat-panel meo-vat-compose" aria-labelledby="meo-vat-compose-title">
            <div className="meo-vat-section-heading"><div><p className="meo-vat-eyebrow">Gửi chia sẻ</p><h2 id="meo-vat-compose-title">Điều gì đã giúp bạn?</h2></div><button className="meo-vat-quiet" onClick={() => setIsComposerOpen(false)} type="button">Đóng</button></div>
            <ChoNeoMeoVatEditor isBusy={busy} notice={notice} onSubmit={(input) => { void submitTip(input); }} submitLabel="Gửi mẹo để xem lại" />
          </section> : notice ? <p className="meo-vat-notice" role="status">{notice} {createdTipHref ? <Link href={createdTipHref}>Mở mẹo của bạn</Link> : null}</p> : null}

          <section className="meo-vat-feed" aria-labelledby="meo-vat-feed-title">
            <div className="meo-vat-section-heading"><div><p className="meo-vat-eyebrow">{mineOnly ? "Bài của bạn" : "Từ cộng đồng"}</p><h2 id="meo-vat-feed-title">{mineOnly ? "Chia sẻ đã gửi" : "Mẹo mới trong chợ"}</h2></div><span className="meo-vat-count">{visibleTips.length} chia sẻ</span></div>
            <label className="meo-vat-search"><span className="sr-only">Tìm trong Mẹo Vặt</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mẹo, sản phẩm, chuyện tiệm..." value={search} /></label>
            <div className="meo-vat-categories" aria-label="Lọc theo chủ đề">
              <button aria-pressed={selectedCategory === "all"} className={selectedCategory === "all" ? "is-active" : ""} onClick={() => setSelectedCategory("all")} type="button">Tất cả</button>
              {CHO_NEO_MEO_VAT_CATEGORIES.map((category) => <button aria-pressed={selectedCategory === category.id} className={selectedCategory === category.id ? "is-active" : ""} key={category.id} onClick={() => setSelectedCategory(category.id)} type="button">{category.label}</button>)}
            </div>

            {loading ? <p className="meo-vat-empty">Đang ghé xem các chia sẻ mới...</p> : visibleTips.length ? <div className="meo-vat-grid">
              {visibleTips.map((tip) => <article className="meo-vat-card" key={tip.id}>
                <Link className="meo-vat-card-link" href={isEmbedded ? `/meo-vat/${tip.id}?embed=1` : `/meo-vat/${tip.id}`}>
                  <span className="meo-vat-category">{categoryLabel(tip.category)}</span>
                  {mineOnly && tip.status ? <span className={`meo-vat-tip-status meo-vat-tip-status--${tip.status}`}>{tipStatusLabel(tip.status)}</span> : null}
                  <h3>{tip.title}</h3>
                  <p className="meo-vat-excerpt">{tip.body}</p>
                  <span className="meo-vat-card-meta">{tip.authorName} <span aria-hidden="true">·</span> {formatDate(tip.createdAt)}</span>
                </Link>
              </article>)}
            </div> : <p className="meo-vat-empty">{search || selectedCategory !== "all" ? "Chưa có chia sẻ khớp với lựa chọn này." : mineOnly ? "Bạn chưa gửi mẹo nào." : "Chợ đang chờ những mẹo đầu tiên từ bạn."}</p>}
          </section>
          {!isEmbedded && !mineOnly && profile?.status === "verified_nail_member" && session ? <Link className="meo-vat-my-tips" href="/meo-vat/cua-toi">Chia sẻ của tôi</Link> : null}
        </div>
      </div>
    </ChoNeoRoomShell>
    <MeoVatStyles />
  </>;
}

function categoryLabel(category: ChoNeoMeoVatCategory) {
  return CHO_NEO_MEO_VAT_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function tipStatusLabel(status: NonNullable<ChoNeoMeoVatTip["status"]>) {
  return ({ hidden: "Đang ẩn", pending_review: "Đang chờ xem", published: "Đã đăng", rejected: "Chưa được đăng" })[status];
}

function MeoVatStyles() {
  return <style jsx global>{`
    .meo-vat-shell { color: #38251c; background: #f8eedb; font-family: var(--font-cho-neo-ui), system-ui, sans-serif; }
    .meo-vat-layout { display: grid; grid-template-columns: 148px minmax(0, 1fr); gap: clamp(14px, 2vw, 26px); width: min(1180px, 100%); margin: 0 auto; padding: clamp(18px, 3vw, 34px); }
    .meo-vat-layout--embedded { display: block; width: 100%; padding: 0; }
    .meo-vat-content { min-width: 0; }
    .meo-vat-content .cho-neo-room-top-bar { border-color: rgba(97,57,30,.18); }
    .meo-vat-content .cho-neo-room-top-bar__back, .meo-vat-content .cho-neo-room-top-bar__member, .meo-vat-content .cho-neo-room-top-bar :global(.cho-neo-feedback-button) { color: #603521; border-color: rgba(97,57,30,.2); background: rgba(255,255,255,.35); }
    .meo-vat-content .cho-neo-room-top-bar__back:hover, .meo-vat-content .cho-neo-room-top-bar__member:hover { background: #fff9ed; }
    .meo-vat-content .cho-neo-room-top-bar__member strong { color: #603521; }
    .meo-vat-hero { position: relative; display: grid; justify-items: start; gap: 12px; overflow: hidden; margin: 14px 0 22px; border: 1px solid rgba(114,67,39,.12); border-radius: 24px; padding: clamp(24px, 5vw, 52px); background: radial-gradient(circle at 88% 14%, rgba(245,193,111,.36), transparent 30%), linear-gradient(135deg,#fff7e8,#f6dfbd); box-shadow: 0 16px 36px rgba(89,51,29,.06); }
    .meo-vat-hero h1 { margin: 0; color: #57291d; font-family: var(--font-cho-neo-display), Georgia, serif; font-size: clamp(42px, 7vw, 72px); font-weight: 500; line-height: .92; }
    .meo-vat-hero > p:not(.meo-vat-eyebrow) { max-width: 580px; margin: 0 0 5px; color: #72503d; font-size: clamp(15px,2vw,18px); line-height: 1.55; }
    .meo-vat-eyebrow { margin: 0; color: #946242; font-size: .73rem; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; }
    .meo-vat-primary, .meo-vat-quiet, .meo-vat-categories button, .meo-vat-report-actions button { min-height: 44px; border: 1px solid rgba(93,45,29,.18); border-radius: 13px; padding: 10px 16px; color: #603521; background: rgba(255,255,255,.65); font: inherit; font-weight: 650; cursor: pointer; }
    .meo-vat-primary { border-color: #763a27; color: #fff8eb; background: #783e2a; box-shadow: 0 7px 18px rgba(94,44,26,.14); }
    .meo-vat-primary:disabled { opacity: .58; cursor: wait; }
    .meo-vat-panel, .meo-vat-card, .meo-vat-empty { border: 1px solid rgba(114,67,39,.14); border-radius: 18px; background: rgba(255,251,242,.78); box-shadow: 0 10px 28px rgba(89,51,29,.045); }
    .meo-vat-panel { margin: 0 0 24px; padding: clamp(17px,3vw,26px); }
    .meo-vat-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .meo-vat-section-heading h2 { margin: 4px 0 0; color: #4f2b20; font-family: var(--font-cho-neo-display), Georgia, serif; font-size: clamp(25px,4vw,36px); font-weight: 500; line-height: 1; }
    .meo-vat-count, .meo-vat-card-meta { color: #8c6d55; font-size: .82rem; }
    .meo-vat-editor { display: grid; gap: 13px; }
    .meo-vat-editor label { display: grid; gap: 7px; color: #684832; font-size: .87rem; font-weight: 650; }
    .meo-vat-editor label span { display:flex; justify-content:space-between; gap: 8px; }
    .meo-vat-editor label small { color:#977a63; font-size:.76rem; font-weight:400; }
    .meo-vat-editor input, .meo-vat-editor textarea, .meo-vat-editor select, .meo-vat-search input, .meo-vat-report-form select, .meo-vat-report-form textarea { box-sizing: border-box; width: 100%; min-height: 46px; border: 1px solid rgba(105,67,43,.2); border-radius: 12px; padding: 11px 13px; color: #432c20; background: rgba(255,255,255,.82); font: inherit; }
    .meo-vat-editor textarea, .meo-vat-report-form textarea { min-height: 140px; resize: vertical; line-height: 1.55; }
    .meo-vat-editor-note { margin: 0; color: #92715a; font-size: .82rem; line-height:1.5; }
    .meo-vat-notice { border-radius: 12px; padding: 11px 13px; color:#5b3a27; background:#f5e7c9; line-height:1.5; }
    .meo-vat-search { display: block; margin-bottom: 12px; }
    .meo-vat-categories { display: flex; gap: 8px; overflow-x: auto; padding: 1px 1px 7px; scrollbar-width: thin; }
    .meo-vat-categories button { flex:0 0 auto; min-height:40px; padding:8px 13px; font-size:.82rem; }
    .meo-vat-categories button.is-active { border-color:rgba(120,62,42,.42); color:#6d301f; background:#f2d8ad; }
    .meo-vat-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:13px; margin-top:13px; }
    .meo-vat-card { min-width:0; transition:transform .16s ease,box-shadow .16s ease; }
    .meo-vat-card:hover { transform:translateY(-2px); box-shadow:0 15px 30px rgba(89,51,29,.09); }
    .meo-vat-card-link { display:grid; align-content:start; gap:11px; height:100%; padding:20px; color:inherit; text-decoration:none; }
    .meo-vat-category { width:max-content; border-radius:999px; padding:5px 9px; color:#7e4f31; background:#f7e7c8; font-size:.71rem; font-weight:700; letter-spacing:.02em; }
    .meo-vat-tip-status { width:max-content; border-radius:999px; padding:4px 8px; color:#725133; background:#f4e9d3; font-size:.7rem; font-weight:650; }
    .meo-vat-tip-status--published { color:#376447; background:#e3f0df; }
    .meo-vat-tip-status--rejected, .meo-vat-tip-status--hidden { color:#804137; background:#f4e1d8; }
    .meo-vat-card h3 { margin:0; color:#4f2b20; font-family:var(--font-cho-neo-display),Georgia,serif; font-size:clamp(22px,3vw,28px); font-weight:500; line-height:1.08; }
    .meo-vat-excerpt { display:-webkit-box; overflow:hidden; margin:0; color:#755943; line-height:1.55; white-space:pre-line; -webkit-box-orient:vertical; -webkit-line-clamp:3; }
    .meo-vat-card-meta { margin-top:auto; padding-top:4px; }
    .meo-vat-empty { margin:14px 0; padding:24px; color:#81644f; text-align:center; line-height:1.5; }
    .meo-vat-my-tips { display:inline-flex; margin:14px 0; color:#783e2a; font-size:.86rem; font-weight:650; }
    .meo-vat-layout .cho-neo-village-rail { margin-top:55px; }
    .meo-vat-mobile-nav { display:none; }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    @media(max-width:820px) { .meo-vat-layout { display:block; padding:0 14px 28px; } .meo-vat-layout > .cho-neo-village-rail { display:none; } .meo-vat-mobile-nav { display:block; } .meo-vat-content .cho-neo-room-top-bar { margin-top:10px; } }
    @media(max-width:620px) { .meo-vat-layout { padding:0 12px 24px; } .meo-vat-grid { grid-template-columns:1fr; gap:10px; } .meo-vat-card-link { padding:17px; } .meo-vat-hero { border-radius:19px; padding:24px 20px; } .meo-vat-section-heading { align-items:start; } .meo-vat-categories { margin-right:-12px; } }
  `}</style>;
}
