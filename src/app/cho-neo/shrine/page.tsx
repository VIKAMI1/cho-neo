"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LOCAL_XIN_XAM_SEED_STICKS,
  ONG_DIA_DAILY_MESSAGES,
  ONG_DIA_LOC_READINGS,
  XIN_XAM_TOPICS,
  type OngDiaLocCategory,
  type OngDiaDailyMessage,
  type OngDiaLocReading,
  type XinXamLuck,
  type XinXamStick,
  type XinXamTopic,
} from "@/lib/cho-neo/xin-xam-sticky";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";

type ShrineMemory = {
  firstVisitedAt: string;
  lastVisitedAt: string;
  visitCount: number;
  lastVisitDay: string;
};

type StoredDraw = XinXamStick & {
  periodKey: string;
  drawnAt: string;
};

type XinXamMemory = {
  drawsByTopicPeriod: Record<string, StoredDraw>;
  history: StoredDraw[];
};

type DailyMessageMemory = {
  dayKey: string;
  messageId: string;
};

type LocMemory = {
  id: string;
  dayKey: string;
  wish: string;
  locNumber: string;
  readingId: string;
  unlockedAt?: string;
};

type LocHistoryEntry = LocMemory & {
  unlockedAt: string;
};

const SHRINE_MEMORY_KEY = "choNeo.ongDiaShrine.v1";
const DAILY_MESSAGE_KEY = "choNeo.ongDiaDailyMessage.v1";
const LOC_MEMORY_KEY = "choNeo.ongDiaLocVault.v2";
const LOC_HISTORY_KEY = "choNeo.ongDiaLocBook.v2";
const XIN_XAM_MEMORY_KEY = "choNeo.xinXamSticky.v1";
const MAX_DAILY_BLESSINGS = 3;

const EMPTY_XIN_XAM_MEMORY: XinXamMemory = {
  drawsByTopicPeriod: {},
  history: [],
};

const LUCK_LABELS: Record<XinXamLuck, string> = {
  DAI_CAT: "Đại cát",
  CAT: "Cát",
  BINH: "Bình",
  HUNG: "Quẻ nhắc nhở",
};

export default function ChoNeoShrinePage() {
  const [shrineMemory, setShrineMemory] = useState<ShrineMemory | null>(null);
  const [dailyMessage, setDailyMessage] = useState<OngDiaDailyMessage>(
    ONG_DIA_DAILY_MESSAGES[0]
  );
  const [locMemories, setLocMemories] = useState<LocMemory[]>([]);
  const [activeLocId, setActiveLocId] = useState<string | null>(null);
  const [wishDraft, setWishDraft] = useState("");
  const [vaultInput, setVaultInput] = useState("");
  const [vaultError, setVaultError] = useState("");
  const [locHistory, setLocHistory] = useState<LocHistoryEntry[]>([]);
  const [blessing, setBlessing] = useState(false);
  const blessingTimerRef = useRef<number | null>(null);
  const [xamAnimating, setXamAnimating] = useState(false);
  const xamAnimationTimerRef = useRef<number | null>(null);
  const [xinXamMemory, setXinXamMemory] = useState<XinXamMemory>(
    EMPTY_XIN_XAM_MEMORY
  );
  const [selectedTopic, setSelectedTopic] = useState<XinXamTopic>("tiem");
  const [activeDraw, setActiveDraw] = useState<StoredDraw | null>(null);
  const [memoryReady, setMemoryReady] = useState(false);

  const currentTopic = useMemo(
    () => XIN_XAM_TOPICS.find((topic) => topic.key === selectedTopic),
    [selectedTopic]
  );

  const locMemory = useMemo(() => {
    if (locMemories.length === 0) return null;
    return (
      locMemories.find((memory) => memory.id === activeLocId) ??
      locMemories[locMemories.length - 1] ??
      null
    );
  }, [activeLocId, locMemories]);

  const blessingsUsed = locMemories.length;
  const hasBlessingsLeft = blessingsUsed < MAX_DAILY_BLESSINGS;

  const activeLocReading = useMemo(() => {
    if (!locMemory?.unlockedAt) return null;
    return getLocReadingById(locMemory.readingId);
  }, [locMemory]);

  useEffect(() => {
    const todayKey = getLocalDayKey(new Date());
    const now = new Date().toISOString();
    let nextShrineMemory: ShrineMemory = {
      firstVisitedAt: now,
      lastVisitedAt: now,
      visitCount: 1,
      lastVisitDay: todayKey,
    };

    try {
      const stored = window.localStorage.getItem(SHRINE_MEMORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ShrineMemory>;
        const lastVisitDay = parsed.lastVisitDay ?? "";
        nextShrineMemory = {
          firstVisitedAt: parsed.firstVisitedAt ?? now,
          lastVisitedAt: now,
          visitCount:
            typeof parsed.visitCount === "number"
              ? parsed.visitCount + (lastVisitDay === todayKey ? 0 : 1)
              : 1,
          lastVisitDay: todayKey,
        };
      }
      window.localStorage.setItem(
        SHRINE_MEMORY_KEY,
        JSON.stringify(nextShrineMemory)
      );
    } catch {
      // Local shrine memory is a convenience only. The ritual still works without it.
    }

    setShrineMemory(nextShrineMemory);

    const nextDailyMessage = loadOrCreateDailyMessage(todayKey);
    setDailyMessage(nextDailyMessage);

    const storedLocMemories = loadLocMemories(todayKey);
    const latestLoc = storedLocMemories[storedLocMemories.length - 1] ?? null;
    setLocMemories(storedLocMemories);
    setActiveLocId(latestLoc?.id ?? null);
    setWishDraft("");
    setVaultInput(latestLoc?.unlockedAt ? latestLoc.locNumber : "");
    setLocHistory(loadLocHistory());

    try {
      const stored = window.localStorage.getItem(XIN_XAM_MEMORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<XinXamMemory>;
        setXinXamMemory({
          drawsByTopicPeriod: parsed.drawsByTopicPeriod ?? {},
          history: Array.isArray(parsed.history) ? parsed.history.slice(0, 7) : [],
        });
      }
    } catch {
      setXinXamMemory(EMPTY_XIN_XAM_MEMORY);
    } finally {
      setMemoryReady(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (blessingTimerRef.current) {
        window.clearTimeout(blessingTimerRef.current);
      }
      if (xamAnimationTimerRef.current) {
        window.clearTimeout(xamAnimationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!memoryReady) return;
    const existingDraw = getStoredDrawForTopic(xinXamMemory, selectedTopic);
    setActiveDraw(existingDraw);
  }, [memoryReady, selectedTopic, xinXamMemory]);

  function handleDraw() {
    const stick = chooseStickForTopic(selectedTopic);
    const periodKey = getPeriodKey(stick.periodKind);
    const memoryKey = getDrawMemoryKey(selectedTopic, periodKey);
    const existing = xinXamMemory.drawsByTopicPeriod[memoryKey];

    if (existing) {
      setActiveDraw(existing);
      return;
    }

    const draw: StoredDraw = {
      ...stick,
      periodKey,
      drawnAt: new Date().toISOString(),
    };

    const nextMemory: XinXamMemory = {
      drawsByTopicPeriod: {
        ...xinXamMemory.drawsByTopicPeriod,
        [memoryKey]: draw,
      },
      history: [draw, ...xinXamMemory.history.filter((item) => item.id !== draw.id)]
        .slice(0, 7),
    };

    setXinXamMemory(nextMemory);
    setActiveDraw(draw);
    triggerXinXamAnimation();

    try {
      window.localStorage.setItem(XIN_XAM_MEMORY_KEY, JSON.stringify(nextMemory));
    } catch {
      // If storage is unavailable, keep the draw for this browser session only.
    }
  }

  function triggerXinXamAnimation() {
    if (xamAnimationTimerRef.current) {
      window.clearTimeout(xamAnimationTimerRef.current);
    }

    setXamAnimating(true);
    xamAnimationTimerRef.current = window.setTimeout(() => {
      setXamAnimating(false);
      xamAnimationTimerRef.current = null;
    }, 2500);
  }

  function handleWishSubmit() {
    const wishInput = document.getElementById("ong-dia-wish");
    const submittedWish =
      wishInput instanceof HTMLInputElement ? wishInput.value : "";
    const wish = submittedWish.trim() || wishDraft.trim();

    if (!wish) {
      setVaultError("Viết một lời khấn nhỏ trước đã nha.");
      return;
    }

    const todayKey = getLocalDayKey(new Date());
    const currentMemories = loadLocMemories(todayKey);

    if (currentMemories.length >= MAX_DAILY_BLESSINGS) {
      setLocMemories(currentMemories);
      setActiveLocId(currentMemories[currentMemories.length - 1]?.id ?? null);
      setVaultInput(
        currentMemories[currentMemories.length - 1]?.unlockedAt
          ? currentMemories[currentMemories.length - 1].locNumber
          : ""
      );
      setVaultError(
        "Hôm nay con đã xin đủ 3 lời rồi. Ông Địa nghe rồi, mai ghé lại xin vía mới nha."
      );
      return;
    }

    const blessingNumber = currentMemories.length + 1;
    const locNumber = createLocNumber(`${todayKey}:${blessingNumber}:${wish}`);
    const wishCategory = detectLocWishCategory(wish);
    const preferredReadingId = detectPreferredLocReadingId(wish, wishCategory);
    const reading = chooseLocReading(
      wishCategory,
      `${todayKey}:${blessingNumber}:${wish}:${locNumber}`,
      preferredReadingId
    );
    const nextLocMemory: LocMemory = {
      id: createLocId(todayKey, blessingNumber, wish),
      dayKey: todayKey,
      wish,
      locNumber,
      readingId: reading.id,
    };

    const nextMemories = [...currentMemories, nextLocMemory];
    setLocMemories(nextMemories);
    setActiveLocId(nextLocMemory.id);
    setWishDraft("");
    setVaultInput("");
    setVaultError("");
    saveLocMemories(nextMemories);
    triggerOngDiaBlessing();
  }

  function triggerOngDiaBlessing() {
    if (blessingTimerRef.current) {
      window.clearTimeout(blessingTimerRef.current);
    }

    setBlessing(true);
    blessingTimerRef.current = window.setTimeout(() => {
      setBlessing(false);
      blessingTimerRef.current = null;
    }, 2500);
  }

  function handleUnlockVault() {
    if (!locMemory) {
      setVaultError("Khấn một lời nhỏ để nhận lộc số trước nha.");
      return;
    }

    const locInput = document.getElementById("ong-dia-loc-number");
    const submittedLocNumber =
      locInput instanceof HTMLInputElement ? locInput.value : "";
    const attemptedLocNumber = submittedLocNumber.trim() || vaultInput.trim();

    if (attemptedLocNumber !== locMemory.locNumber) {
      setVaultError("Lộc số chưa khớp. Nhập đúng số Ông Địa đã đưa hôm nay.");
      return;
    }

    const nextLocMemory: LocMemory = {
      ...locMemory,
      unlockedAt: locMemory.unlockedAt ?? new Date().toISOString(),
    };
    const nextMemories = locMemories.map((memory) =>
      memory.id === nextLocMemory.id ? nextLocMemory : memory
    );

    setLocMemories(nextMemories);
    setActiveLocId(nextLocMemory.id);
    setVaultInput(nextLocMemory.locNumber);
    setVaultError("");
    saveLocMemories(nextMemories);
    setLocHistory(saveLocHistory(nextLocMemory));
  }

  const visitCopy = shrineMemory
    ? shrineMemory.visitCount > 1
      ? `Con đã ghé bàn Ông Địa ${shrineMemory.visitCount} ngày. Hôm nay cứ ngồi xuống nhẹ nhàng.`
      : "Lần đầu ghé bàn Ông Địa trong trình duyệt này. Cứ ngồi xuống, thở một nhịp."
    : "Ông Địa đang dọn bàn cho con ngồi xuống một chút.";

  const drawButtonCopy = activeDraw
    ? "Xem lại quẻ 7 ngày"
    : "Xin một quẻ nhẹ";

  return (
    <main className="shrine-page">
      <ChoNeoTimeAmbience />
      <div className="lantern-glow" />
      <div className="floor-grid" />

      <section className="shrine-shell" aria-labelledby="shrine-title">
        <header className="shrine-header">
          <div>
            <p className="eyebrow">
              Bàn Ông Địa
              <span>Ong Dia Shrine</span>
            </p>
            <h1 id="shrine-title">
              Ghé Ông Địa
              <span>Come Back To The Shrine</span>
            </h1>
            <p className="intro">
              Ông Địa nhắc nhẹ: làm ăn có nhịp, giữ lòng có gốc. Mỗi ngày ghé
              một chút, xin một lời cho rõ đường, rồi tự mình đi tiếp.
              <span>
                A quiet Cho Neo ritual for salon life, practical luck, and a
                steady heart.
              </span>
            </p>
          </div>

          <Link className="back-link" href="/cho-neo">
            <span className="back-kicker">Sân Làng</span>
            <span>Về Chợ Neo</span>
            <small>Back to Village Square</small>
          </Link>
        </header>

        <section className="shrine-room" aria-label="Phòng thờ Ông Địa">
          <div className="altar-panel">
            <div className="altar">
              <span className="altar-light" />
              <div className={`ong-dia-frame ${blessing ? "blessing" : ""}`}>
                {blessing ? (
                  <>
                    <span className="blessing-glow" aria-hidden="true" />
                    <span className="sparkle sparkle-one" aria-hidden="true" />
                    <span className="sparkle sparkle-two" aria-hidden="true" />
                    <span className="sparkle sparkle-three" aria-hidden="true" />
                  </>
                ) : null}
                <Image
                  src="/ong-dia.png"
                  alt="Ông Địa"
                  width={180}
                  height={180}
                  priority
                />
              </div>
              <div className="offering-row" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <section className="daily-note" aria-label="Lời nhắc hôm nay">
              <p className="card-kicker">
                Lời Ông Địa Hôm Nay
                <span>Daily Shrine Memory</span>
              </p>
              <h2>{dailyMessage.title}</h2>
              <p>{dailyMessage.body}</p>
              <p>{visitCopy}</p>
              <p className="comeback-line">{dailyMessage.comebackLine}</p>
              <p className="soft-warning">
                Đây là lời nhắc văn hóa cho lòng bớt rối, không phải lời hứa
                chắc chắn về tiền bạc, sức khỏe, pháp lý, hay tương lai.
              </p>
            </section>
          </div>

          <section className="loc-panel" aria-labelledby="loc-title">
            <div className="loc-heading">
              <div>
                <p className="card-kicker">
                  Khấn Ông Địa / Xin Lộc Hôm Nay
                  <span>Number-vault blessing lane</span>
                </p>
                <h2 id="loc-title">Khấn một điều nhỏ, mở một lời nhắc.</h2>
                <p>
                  Viết một lời xin vía cho hôm nay: khách, chìa khóa thất lạc,
                  bài thi, bụng khó chịu, chuyện nhà, bình yên trong tiệm, tự
                  tin, can đảm, hay chút may mắn trong ngày. Ông Địa nghe rồi
                  sẽ cho một lộc số để mở Kho Lộc. Lộc số là chìa khóa mở lời
                  nhắc, không phải lời hứa kết quả.
                </p>
              </div>
              <div className="loc-number-card">
                <span>Lộc số</span>
                <strong>{locMemory?.locNumber ?? "--"}</strong>
                <small>
                  {blessingsUsed}/{MAX_DAILY_BLESSINGS} lời hôm nay
                </small>
              </div>
            </div>

            <div className="wish-row">
              <label htmlFor="ong-dia-wish">
                Lời khấn hôm nay
                <span>
                  Tiếng Việt, English, hay Vietlish đều được. Mỗi ngày tối đa 3
                  lời khấn nhỏ.
                </span>
              </label>
              <div className="wish-controls">
                <input
                  id="ong-dia-wish"
                  value={wishDraft}
                  onChange={(event) => {
                    setWishDraft(event.target.value);
                    setVaultError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleWishSubmit();
                    }
                  }}
                  disabled={!hasBlessingsLeft}
                  maxLength={120}
                  placeholder="Ví dụ: Ông Địa ơi cho con bình tĩnh tìm chìa khóa."
                />
                <button type="button" onClick={handleWishSubmit}>
                  {hasBlessingsLeft ? "Gửi lời khấn" : "Mai ghé lại"}
                </button>
              </div>
              {!hasBlessingsLeft && (
                <p className="daily-limit-note">
                  Hôm nay con đã xin đủ 3 lời rồi. Ông Địa nghe rồi, mai ghé
                  lại xin vía mới nha.
                </p>
              )}
            </div>

            {locMemory && (
              <div className="vault-row">
                <div>
                  <strong>Kho Lộc</strong>
                  <span>
                    Nhập lộc số của lời khấn đang chọn để mở lời nhắc. Không
                    đổi số, không quay lại lấy số khác cho cùng lời khấn.
                  </span>
                </div>
                <div className="vault-controls">
                  <input
                    id="ong-dia-loc-number"
                    inputMode="numeric"
                    value={vaultInput}
                    onChange={(event) => {
                      setVaultInput(event.target.value.replace(/\D/g, "").slice(0, 2));
                      setVaultError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleUnlockVault();
                      }
                    }}
                    placeholder="Nhập lộc số"
                  />
                  <button type="button" onClick={handleUnlockVault}>
                    Mở Kho Lộc
                  </button>
                </div>
              </div>
            )}

            {vaultError && <p className="vault-error">{vaultError}</p>}

            {locMemory && (
              <article className="loc-result" aria-live="polite">
                <p>
                  Ông Địa nghe rồi. Lộc số hôm nay là{" "}
                  <strong>{locMemory.locNumber}</strong> — con số này để mở
                  vía, không phải lời hứa kết quả.
                </p>
                <blockquote>“{locMemory.wish}”</blockquote>
                {activeLocReading ? (
                  <>
                    <h3>Lời Ông Địa</h3>
                    <p>{activeLocReading.waterLine}</p>
                    <p>{activeLocReading.vibeLine}</p>
                    <p className="comeback-line">{activeLocReading.comebackLine}</p>
                  </>
                ) : (
                  <p>
                    Nhập lộc số vào Kho Lộc để mở lời nhắc hôm nay. Có lộc thì
                    nhận, chưa có thì giữ vía cho yên.
                  </p>
                )}
              </article>
            )}

            {locHistory.length > 0 && (
              <section className="loc-book" aria-label="Sổ Lộc 7 Ngày">
                <p className="card-kicker">
                  Sổ Lộc 7 Ngày
                  <span>Saved local blessings</span>
                </p>
                <div className="loc-book-list">
                  {locHistory.map((entry) => {
                    const reading = getLocReadingById(entry.readingId);
                    return (
                      <button
                        key={`${entry.dayKey}-${entry.locNumber}`}
                        type="button"
                        onClick={() => {
                          setLocMemories((current) =>
                            current.some((memory) => memory.id === entry.id)
                              ? current
                              : [entry]
                          );
                          setActiveLocId(entry.id);
                          setWishDraft("");
                          setVaultInput(entry.locNumber);
                          setVaultError("");
                        }}
                      >
                        <strong>{entry.dayKey} · Lộc số {entry.locNumber}</strong>
                        <span>{reading.comebackLine}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </section>

          <section className="xin-xam-panel" aria-labelledby="xin-xam-title">
            <div className="xin-xam-heading">
              <div>
                <p className="card-kicker">
                  Nghi thức Xin Xăm
                  <span>Local Sticky Ritual</span>
                </p>
                <h2 id="xin-xam-title">Chọn một chuyện, giữ một quẻ.</h2>
                <p>
                  Mỗi chủ đề chỉ xin một lần trong 7 ngày trên trình duyệt này.
                  Quẻ này theo con 7 ngày. Đừng rút vội quẻ mới — nghe quẻ này
                  trước đã.
                </p>
              </div>
              <div className={`xin-xam-image ${xamAnimating ? "drawing" : ""}`}>
                <span className="xam-cup-glow" aria-hidden="true" />
                {xamAnimating ? (
                  <>
                    <span className="xam-rattle-stick xam-rattle-one" aria-hidden="true" />
                    <span className="xam-rattle-stick xam-rattle-two" aria-hidden="true" />
                    <span className="xam-rattle-stick xam-rattle-three" aria-hidden="true" />
                    <span className="xam-jump-stick" aria-hidden="true" />
                  </>
                ) : null}
                <Image
                  src="/Xin-Xam.png"
                  alt="Ống Xin Xăm"
                  width={120}
                  height={180}
                />
              </div>
            </div>

            <div className="topic-grid" aria-label="Chọn chủ đề Xin Xăm">
              {XIN_XAM_TOPICS.map((topic) => {
                const isActive = topic.key === selectedTopic;
                const savedDraw = getStoredDrawForTopic(xinXamMemory, topic.key);
                return (
                  <button
                    key={topic.key}
                    type="button"
                    className={isActive ? "topic-card active" : "topic-card"}
                    onClick={() => setSelectedTopic(topic.key)}
                  >
                    <strong>{topic.label}</strong>
                    <span>{topic.helper}</span>
                    {savedDraw && (
                      <small>
                        Đã có quẻ 7 ngày
                      </small>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="draw-row">
              <div>
                <strong>{currentTopic?.label ?? "Tiệm"}</strong>
                <span>{currentTopic?.helper}</span>
              </div>
              <button type="button" onClick={handleDraw}>
                {drawButtonCopy}
              </button>
            </div>

            {activeDraw ? (
              <article
                className={`stick-result ${xamAnimating ? "stick-result-revealing" : ""}`}
                aria-live="polite"
              >
                <div className="stick-meta">
                  <span className={`luck-pill ${activeDraw.luck.toLowerCase()}`}>
                    {LUCK_LABELS[activeDraw.luck]}
                  </span>
                  <span>
                    Quẻ này theo con 7 ngày
                  </span>
                  <span>{activeDraw.periodKey}</span>
                </div>
                <h3>{activeDraw.title}</h3>
                <p className="luc-bat">{activeDraw.lucBat}</p>
                <p>{activeDraw.meaning}</p>
                <div className="advice-box">
                  <strong>Ông Địa nhắc nhẹ...</strong>
                  <span>{activeDraw.advice}</span>
                </div>
                <p className="comeback-line">{activeDraw.comebackLine}</p>
              </article>
            ) : (
              <div className="stick-empty">
                <strong>Chưa xin quẻ cho chủ đề này.</strong>
                <span>
                  Chọn một chuyện thật trong tiệm hoặc trong lòng. Xin xong thì
                  để quẻ ngồi yên tới hết kỳ.
                </span>
              </div>
            )}
          </section>

          {xinXamMemory.history.length > 0 && (
            <section className="history-panel" aria-label="Bảy quẻ gần đây">
              <p className="card-kicker">
                Quẻ đã nhớ
                <span>Last 7 local results</span>
              </p>
              <div className="history-list">
                {xinXamMemory.history.map((draw) => (
                  <button
                    key={`${draw.id}-${draw.periodKey}`}
                    type="button"
                    onClick={() => {
                      setSelectedTopic(draw.topic);
                      setActiveDraw(draw);
                    }}
                  >
                    <strong>{draw.title}</strong>
                    <span>
                      {getTopicLabel(draw.topic)} · {LUCK_LABELS[draw.luck]}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>
      </section>

      <style>{`
        .shrine-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background: var(--cho-neo-room-page-background);
        }

        .lantern-glow,
        .floor-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .lantern-glow {
          background: var(--cho-neo-room-glow-background);
        }

        .floor-grid {
          top: 40%;
          transform: perspective(620px) rotateX(62deg);
          transform-origin: bottom center;
          background-image:
            linear-gradient(rgba(253, 230, 138, 0.13) 1px, transparent 1px),
            linear-gradient(90deg, rgba(253, 230, 138, 0.1) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 100%);
          opacity: var(--cho-neo-floor-opacity);
        }

        .shrine-shell {
          position: relative;
          z-index: 1;
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .shrine-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .eyebrow,
        .card-kicker {
          margin: 0 0 8px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .eyebrow span,
        .card-kicker span,
        h1 span,
        .intro span,
        .back-link small {
          display: block;
          margin-top: 4px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 0.72em;
          letter-spacing: 0;
          text-transform: none;
        }

        h1 {
          margin: 0;
          font-size: clamp(44px, 8vw, 88px);
          line-height: 0.9;
          letter-spacing: -0.045em;
          text-wrap: balance;
        }

        h1 span {
          margin-top: 10px;
          font-size: clamp(18px, 2.4vw, 28px);
          line-height: 1.08;
        }

        .intro {
          max-width: 720px;
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.84);
          font-size: clamp(16px, 1.8vw, 21px);
          line-height: 1.5;
        }

        .intro span {
          font-size: 0.78em;
          line-height: 1.45;
        }

        .back-link {
          flex: 0 0 auto;
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          min-height: 58px;
          padding: 8px 16px;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 14px;
          line-height: 1.12;
          font-weight: 950;
          text-decoration: none;
          box-shadow: 0 0 34px rgba(251, 191, 36, 0.22);
        }

        .back-kicker {
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.68;
        }

        .back-link small {
          color: rgba(17, 24, 39, 0.62);
          font-size: 11px;
        }

        .shrine-room {
          position: relative;
          overflow: hidden;
          margin-top: 22px;
          padding: 26px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 34px;
          background:
            radial-gradient(circle at 50% 14%, rgba(253, 230, 138, 0.22), transparent 30%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.04)),
            rgba(8, 13, 28, 0.62);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }

        .shrine-room::before {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -190px;
          width: min(980px, 108%);
          height: 430px;
          transform: translateX(-50%) rotate(-2deg);
          border-radius: 50%;
          background: rgba(75, 47, 60, 0.74);
          box-shadow: inset 0 0 48px rgba(0, 0, 0, 0.24);
        }

        .altar-panel,
        .loc-panel,
        .xin-xam-panel,
        .history-panel {
          position: relative;
          z-index: 2;
        }

        .altar-panel {
          display: grid;
          grid-template-columns: minmax(240px, 0.78fr) minmax(0, 1.22fr);
          gap: 18px;
          align-items: stretch;
        }

        .altar {
          position: relative;
          display: grid;
          justify-items: center;
          align-content: center;
          min-height: 310px;
        }

        .altar-light {
          position: absolute;
          top: 14px;
          width: 260px;
          height: 190px;
          border-radius: 50%;
          background: rgba(251, 191, 36, 0.28);
          filter: blur(28px);
        }

        .ong-dia-frame {
          position: relative;
          width: 196px;
          height: 196px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(253, 230, 138, 0.34);
          border-radius: 34px;
          background: rgba(253, 230, 138, 0.12);
          box-shadow:
            0 0 58px rgba(251, 191, 36, 0.24),
            0 22px 60px rgba(0, 0, 0, 0.34);
        }

        .ong-dia-frame.blessing {
          overflow: visible;
          animation: nod 0.6s ease-in-out;
        }

        .ong-dia-frame img {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 34px;
        }

        .blessing-glow {
          position: absolute;
          inset: -28px;
          z-index: 0;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(253, 230, 138, 0.56), transparent 68%);
          box-shadow:
            0 0 44px rgba(251, 191, 36, 0.55),
            0 0 96px rgba(245, 158, 11, 0.34);
          animation: glow 2.5s ease-out forwards;
          pointer-events: none;
        }

        .sparkle {
          position: absolute;
          z-index: 3;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #fde68a;
          box-shadow:
            0 0 10px rgba(253, 230, 138, 0.92),
            0 0 22px rgba(251, 191, 36, 0.72);
          animation: floatUp 2.5s ease-out forwards;
          pointer-events: none;
        }

        .sparkle::before,
        .sparkle::after {
          content: "";
          position: absolute;
          inset: 50% auto auto 50%;
          width: 17px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255, 247, 237, 0.88);
          transform: translate(-50%, -50%);
        }

        .sparkle::after {
          transform: translate(-50%, -50%) rotate(90deg);
        }

        .sparkle-one {
          left: 18px;
          bottom: 42px;
          animation-delay: 0.05s;
        }

        .sparkle-two {
          left: calc(50% - 4px);
          bottom: 20px;
          animation-delay: 0.2s;
        }

        .sparkle-three {
          right: 20px;
          bottom: 54px;
          animation-delay: 0.34s;
        }

        .offering-row {
          position: relative;
          width: min(360px, 100%);
          height: 92px;
          margin-top: -18px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 50%;
          background: rgba(101, 64, 75, 0.86);
          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.3),
            inset 0 0 28px rgba(0, 0, 0, 0.22);
        }

        .offering-row span {
          position: absolute;
          bottom: 28px;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff7ed, #fbbf24);
          box-shadow: 0 0 24px rgba(251, 191, 36, 0.34);
        }

        .offering-row span:nth-child(1) { left: 28%; }
        .offering-row span:nth-child(2) { left: 50%; transform: translateX(-50%); }
        .offering-row span:nth-child(3) { right: 28%; }

        @keyframes nod {
          0% { transform: translateY(0) rotate(0deg); }
          35% { transform: translateY(4px) rotate(1.5deg); }
          70% { transform: translateY(-2px) rotate(-0.8deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }

        @keyframes glow {
          0% {
            opacity: 0;
            transform: scale(0.78);
          }
          28% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.18);
          }
        }

        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.72);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-74px) scale(1.08);
          }
        }

        @keyframes cupShake {
          0%, 100% { transform: rotate(0deg); }
          18% { transform: rotate(-3deg); }
          36% { transform: rotate(3deg); }
          54% { transform: rotate(-2deg); }
          72% { transform: rotate(2deg); }
        }

        @keyframes stickRattle {
          0%, 100% {
            opacity: 0.78;
            transform: translateY(0) rotate(var(--stick-tilt, 0deg));
          }
          30% {
            opacity: 1;
            transform: translateY(-4px) rotate(calc(var(--stick-tilt, 0deg) - 5deg));
          }
          62% {
            opacity: 0.9;
            transform: translateY(2px) rotate(calc(var(--stick-tilt, 0deg) + 4deg));
          }
        }

        @keyframes stickJump {
          0% {
            opacity: 0;
            transform: translateY(0) rotate(1deg);
          }
          18% {
            opacity: 1;
          }
          58% {
            opacity: 1;
            transform: translateY(-72px) rotate(-4deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-92px) rotate(-4deg);
          }
        }

        @keyframes xamGlow {
          0% { opacity: 0; transform: scale(0.86); }
          24% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.12); }
        }

        @keyframes cardUnfold {
          0% {
            opacity: 0;
            transform: translateY(-8px) scaleY(0.9);
            box-shadow: 0 0 0 rgba(251, 191, 36, 0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scaleY(1);
            box-shadow: 0 0 34px rgba(251, 191, 36, 0.12);
          }
        }

        .daily-note,
        .loc-panel,
        .xin-xam-panel,
        .history-panel {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 28, 0.72);
          box-shadow:
            0 18px 54px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(12px);
        }

        .daily-note {
          padding: 22px;
        }

        .daily-note h2,
        .loc-heading h2,
        .xin-xam-heading h2,
        .stick-result h3 {
          margin: 0;
          font-size: clamp(25px, 3vw, 40px);
          line-height: 1.02;
          letter-spacing: -0.035em;
          text-wrap: balance;
        }

        .daily-note p:not(.card-kicker),
        .loc-heading p,
        .xin-xam-heading p,
        .stick-result p,
        .stick-empty span {
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.74);
          font-size: 14px;
          line-height: 1.55;
        }

        .soft-warning {
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(253, 230, 138, 0.78) !important;
        }

        .xin-xam-panel {
          margin-top: 18px;
          padding: 22px;
        }

        .loc-panel {
          margin-top: 18px;
          padding: 22px;
        }

        .loc-heading {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 128px;
          gap: 18px;
          align-items: start;
        }

        .loc-number-card {
          min-height: 128px;
          display: grid;
          place-items: center;
          align-content: center;
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 22px;
          background:
            radial-gradient(circle at 50% 30%, rgba(253, 230, 138, 0.22), transparent 58%),
            rgba(253, 230, 138, 0.09);
        }

        .loc-number-card span,
        .loc-number-card strong,
        .loc-number-card small,
        .wish-row label,
        .wish-row label span,
        .vault-row strong,
        .vault-row span {
          display: block;
        }

        .loc-number-card span {
          color: rgba(255, 247, 237, 0.68);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .loc-number-card strong {
          margin-top: 8px;
          color: #fde68a;
          font-size: 42px;
          line-height: 1;
        }

        .loc-number-card small {
          margin-top: 8px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 11px;
          font-weight: 800;
        }

        .wish-row,
        .vault-row {
          margin-top: 16px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.14);
        }

        .wish-row label {
          color: #fde68a;
          font-size: 13px;
          font-weight: 900;
        }

        .wish-row label span,
        .vault-row span {
          margin-top: 4px;
          color: rgba(255, 247, 237, 0.64);
          font-size: 12px;
          font-weight: 500;
        }

        .wish-controls,
        .vault-controls {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .wish-controls input,
        .vault-controls input {
          flex: 1 1 auto;
          min-width: 0;
          height: 44px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 999px;
          color: #fff7ed;
          background: rgba(255, 255, 255, 0.08);
          padding: 0 14px;
          font-size: 14px;
          outline: none;
        }

        .wish-controls input:disabled {
          opacity: 0.72;
        }

        .wish-controls input::placeholder,
        .vault-controls input::placeholder {
          color: rgba(255, 247, 237, 0.42);
        }

        .wish-controls button,
        .vault-controls button {
          flex: 0 0 auto;
          min-height: 44px;
          padding: 0 16px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 14px;
          font-weight: 950;
          cursor: pointer;
        }

        .wish-controls button:disabled {
          cursor: default;
          opacity: 0.76;
        }

        .vault-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 0.75fr);
          gap: 14px;
          align-items: center;
        }

        .vault-error {
          margin: 10px 0 0;
          color: #fecdd3;
          font-size: 13px;
          font-weight: 800;
        }

        .daily-limit-note {
          margin: 10px 0 0;
          color: rgba(253, 230, 138, 0.86);
          font-size: 13px;
          line-height: 1.45;
          font-weight: 800;
        }

        .loc-result {
          margin-top: 16px;
          padding: 18px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 22px;
          background: rgba(253, 230, 138, 0.08);
        }

        .loc-result p,
        .loc-result blockquote {
          margin: 12px 0 0;
          color: rgba(255, 247, 237, 0.76);
          font-size: 14px;
          line-height: 1.55;
        }

        .loc-result h3 {
          margin: 16px 0 0;
          color: #fde68a;
          font-size: 18px;
        }

        .loc-result p:first-child {
          margin-top: 0;
          color: #fde68a;
        }

        .loc-result blockquote {
          padding-left: 12px;
          border-left: 3px solid rgba(253, 230, 138, 0.38);
          font-style: italic;
        }

        .loc-book {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }

        .loc-book-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .loc-book-list button {
          min-height: 82px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          color: #fff7ed;
          text-align: left;
          background: rgba(255, 255, 255, 0.055);
          cursor: pointer;
        }

        .loc-book-list strong,
        .loc-book-list span {
          display: block;
        }

        .loc-book-list span {
          margin-top: 6px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 12px;
          line-height: 1.35;
        }

        .xin-xam-heading {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 128px;
          gap: 18px;
          align-items: start;
        }

        .xin-xam-image {
          position: relative;
          width: 104px;
          height: 138px;
          justify-self: end;
          display: grid;
          place-items: center;
          overflow: visible;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 20px;
          background: rgba(253, 230, 138, 0.1);
        }

        .xin-xam-image.drawing {
          animation: cupShake 0.72s ease-in-out;
        }

        .xin-xam-image img {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 20px;
        }

        .xam-cup-glow {
          position: absolute;
          inset: -16px;
          z-index: 0;
          border-radius: 28px;
          background: radial-gradient(circle at 50% 58%, rgba(253, 230, 138, 0.22), transparent 70%);
          opacity: 0;
          pointer-events: none;
        }

        .xin-xam-image.drawing .xam-cup-glow {
          animation: xamGlow 2.5s ease-out forwards;
        }

        .xam-rattle-stick,
        .xam-jump-stick {
          position: absolute;
          z-index: 3;
          width: 6px;
          height: 62px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fef3c7, #d97706);
          box-shadow: 0 0 14px rgba(253, 230, 138, 0.58);
          pointer-events: none;
          transform-origin: 50% 100%;
        }

        .xam-rattle-stick {
          top: 24px;
          opacity: 0.78;
          animation: stickRattle 0.72s ease-in-out;
        }

        .xam-rattle-one {
          left: 34px;
          --stick-tilt: -8deg;
          transform: rotate(var(--stick-tilt));
          animation-delay: 0.02s;
        }

        .xam-rattle-two {
          left: 49px;
          --stick-tilt: 2deg;
          transform: rotate(var(--stick-tilt));
          animation-delay: 0.1s;
        }

        .xam-rattle-three {
          right: 34px;
          --stick-tilt: 9deg;
          transform: rotate(var(--stick-tilt));
          animation-delay: 0.16s;
        }

        .xam-jump-stick {
          left: calc(50% - 3px);
          top: 30px;
          opacity: 0;
          animation: stickJump 1.35s ease-out 0.28s forwards;
        }

        .topic-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }

        .topic-card {
          min-height: 122px;
          padding: 13px;
          border: 1px solid rgba(253, 230, 138, 0.16);
          border-radius: 18px;
          color: #fff7ed;
          text-align: left;
          background: rgba(255, 255, 255, 0.055);
          cursor: pointer;
        }

        .topic-card.active {
          border-color: rgba(253, 230, 138, 0.62);
          background: rgba(253, 230, 138, 0.16);
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.1);
        }

        .topic-card strong,
        .topic-card span,
        .topic-card small,
        .draw-row strong,
        .draw-row span,
        .history-list strong,
        .history-list span {
          display: block;
        }

        .topic-card strong {
          font-size: 17px;
        }

        .topic-card span {
          margin-top: 8px;
          color: rgba(255, 247, 237, 0.68);
          font-size: 12px;
          line-height: 1.35;
        }

        .topic-card small {
          margin-top: 10px;
          color: #fde68a;
          font-size: 11px;
          font-weight: 800;
        }

        .draw-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 16px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.14);
        }

        .draw-row span {
          margin-top: 4px;
          color: rgba(255, 247, 237, 0.68);
          font-size: 13px;
        }

        .draw-row button {
          flex: 0 0 auto;
          min-height: 44px;
          padding: 0 16px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 14px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 0 28px rgba(251, 191, 36, 0.18);
        }

        .stick-result,
        .stick-empty {
          margin-top: 16px;
          padding: 18px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 22px;
          background: rgba(253, 230, 138, 0.08);
        }

        .stick-result-revealing {
          transform-origin: top center;
          animation: cardUnfold 1.05s ease-out 0.42s both;
        }

        .stick-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .stick-meta span,
        .luck-pill {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          color: rgba(255, 247, 237, 0.78);
          background: rgba(255, 255, 255, 0.07);
          font-size: 12px;
          font-weight: 850;
        }

        .luck-pill.dai_cat,
        .luck-pill.cat {
          color: #052e16;
          background: #bbf7d0;
        }

        .luck-pill.binh {
          color: #292524;
          background: #fed7aa;
        }

        .luck-pill.hung {
          color: #fff1f2;
          background: #9f1239;
        }

        .luc-bat {
          white-space: pre-line;
          color: #fde68a !important;
          font-size: 16px !important;
          font-style: italic;
        }

        .advice-box {
          margin-top: 14px;
          padding: 14px;
          border-radius: 18px;
          color: #111827;
          background: #fde68a;
        }

        .advice-box strong,
        .advice-box span {
          display: block;
        }

        .advice-box span {
          margin-top: 5px;
          font-size: 14px;
          line-height: 1.45;
        }

        .comeback-line {
          color: rgba(253, 230, 138, 0.88) !important;
          font-weight: 800;
        }

        .stick-empty strong {
          display: block;
          color: #fde68a;
        }

        .history-panel {
          margin-top: 18px;
          padding: 18px;
        }

        .history-list {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .history-list button {
          min-height: 82px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          color: #fff7ed;
          text-align: left;
          background: rgba(255, 255, 255, 0.055);
          cursor: pointer;
        }

        .history-list span {
          margin-top: 6px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .shrine-header,
          .draw-row {
            flex-direction: column;
            align-items: stretch;
          }

          .altar-panel,
          .loc-heading,
          .xin-xam-heading {
            grid-template-columns: 1fr;
          }

          .xin-xam-image {
            justify-self: start;
          }

          .vault-row,
          .wish-controls,
          .vault-controls {
            grid-template-columns: 1fr;
            flex-direction: column;
            align-items: stretch;
          }

          .topic-grid,
          .loc-book-list,
          .history-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .shrine-shell {
            max-width: 100vw;
            overflow-x: hidden;
            padding: 16px 12px 22px;
          }

          h1 {
            max-width: 100%;
            overflow-wrap: anywhere;
            font-size: clamp(40px, 13vw, 52px);
          }

          .back-link {
            width: 100%;
          }

          .shrine-room,
          .loc-panel,
          .xin-xam-panel {
            padding: 16px;
          }

          .topic-grid,
          .loc-book-list,
          .history-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function getStoredDrawForTopic(memory: XinXamMemory, topic: XinXamTopic) {
  const seed = LOCAL_XIN_XAM_SEED_STICKS.find((stick) => stick.topic === topic);
  if (!seed) return null;
  const periodKey = getPeriodKey(seed.periodKind);
  return memory.drawsByTopicPeriod[getDrawMemoryKey(topic, periodKey)] ?? null;
}

function loadOrCreateDailyMessage(dayKey: string) {
  try {
    const stored = window.localStorage.getItem(DAILY_MESSAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<DailyMessageMemory>;
      const storedMessage = ONG_DIA_DAILY_MESSAGES.find(
        (message) => message.id === parsed.messageId
      );
      if (parsed.dayKey === dayKey && storedMessage) return storedMessage;
    }

    const message =
      ONG_DIA_DAILY_MESSAGES[
        Math.abs(hashString(dayKey)) % ONG_DIA_DAILY_MESSAGES.length
      ] ?? ONG_DIA_DAILY_MESSAGES[0];
    window.localStorage.setItem(
      DAILY_MESSAGE_KEY,
      JSON.stringify({ dayKey, messageId: message.id } satisfies DailyMessageMemory)
    );
    return message;
  } catch {
    return ONG_DIA_DAILY_MESSAGES[0];
  }
}

function loadLocMemories(dayKey: string) {
  try {
    const stored = window.localStorage.getItem(LOC_MEMORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;

    if (Array.isArray(parsed)) {
      return parsed
        .map((value, index) => normalizeLocMemory(value, index))
        .filter((memory): memory is LocMemory => Boolean(memory))
        .filter((memory) => memory.dayKey === dayKey)
        .slice(0, MAX_DAILY_BLESSINGS);
    }

    const migrated = normalizeLocMemory(parsed, 0);
    return migrated?.dayKey === dayKey ? [migrated] : [];
  } catch {
    return [];
  }
}

function saveLocMemories(memories: LocMemory[]) {
  try {
    window.localStorage.setItem(
      LOC_MEMORY_KEY,
      JSON.stringify(memories.slice(0, MAX_DAILY_BLESSINGS))
    );
  } catch {
    // Local lộc memory is intentionally browser-only and non-critical.
  }
}

function loadLocHistory() {
  try {
    const stored = window.localStorage.getItem(LOC_HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .flatMap((value, index): LocHistoryEntry[] => {
        const memory = normalizeLocMemory(value, index);
        return memory?.unlockedAt ? [{ ...memory, unlockedAt: memory.unlockedAt }] : [];
      })
      .slice(0, 7);
  } catch {
    return [];
  }
}

function saveLocHistory(memory: LocMemory) {
  if (!memory.unlockedAt) return loadLocHistory();

  const nextHistory = [
    memory as LocHistoryEntry,
    ...loadLocHistory().filter((entry) => entry.id !== memory.id),
  ].slice(0, 7);

  try {
    window.localStorage.setItem(LOC_HISTORY_KEY, JSON.stringify(nextHistory));
  } catch {
    // The lộc book is local convenience only.
  }

  return nextHistory;
}

function normalizeLocMemory(value: unknown, index: number): LocMemory | null {
  if (!value || typeof value !== "object") return null;
  const memory = value as Partial<LocMemory>;
  if (
    !memory.dayKey ||
    !memory.wish ||
    !memory.locNumber ||
    !memory.readingId
  ) {
    return null;
  }
  return {
    id: memory.id ?? createLocId(memory.dayKey, index + 1, memory.wish),
    dayKey: memory.dayKey,
    wish: memory.wish,
    locNumber: memory.locNumber,
    readingId: memory.readingId,
    unlockedAt: memory.unlockedAt,
  } satisfies LocMemory;
}

function createLocNumber(seed: string) {
  const value = (Math.abs(hashString(seed)) % 90) + 10;
  return `${value}`.padStart(2, "0");
}

function createLocId(dayKey: string, blessingNumber: number, wish: string) {
  return `${dayKey}:${blessingNumber}:${Math.abs(hashString(wish))}`;
}

const LOC_WISH_CATEGORY_KEYWORDS: Record<OngDiaLocCategory, string[]> = {
  lost_keys: [
    "chìa khóa",
    "chia khoa",
    "key",
    "keys",
    "lost key",
    "lost keys",
    "mất chìa",
    "mat chia",
    "mất đồ",
    "mat do",
    "thất lạc",
    "that lac",
  ],
  exam_test: [
    "thi",
    "bài thi",
    "bai thi",
    "test",
    "exam",
    "driving test",
    "road test",
    "pass the driving test",
    "pass test",
    "license test",
    "bằng lái",
    "bang lai",
    "thi lái xe",
    "thi lai xe",
    "thi bằng lái",
    "thi bang lai",
    "đậu bằng lái",
    "dau bang lai",
  ],
  health_body: [
    "đau bụng",
    "dau bung",
    "stomach",
    "sick",
    "mệt",
    "met",
    "health",
    "sức khỏe",
    "suc khoe",
  ],
  money_tip: [
    "tip",
    "tips",
    "tiền",
    "tien",
    "khách",
    "khach",
    "sale",
    "customers",
  ],
  shop_peace: [
    "tiệm",
    "tiem",
    "salon",
    "shop",
    "nhân viên",
    "nhan vien",
    "khách khó",
    "khach kho",
    "bình yên",
    "binh yen",
  ],
  family_home: [
    "nhà",
    "nha",
    "family",
    "gia đình",
    "gia dinh",
    "con cái",
    "con cai",
    "ba mẹ",
    "ba me",
    "cha mẹ",
    "cha me",
  ],
  confidence: [
    "tự tin",
    "tu tin",
    "confidence",
    "can đảm",
    "can dam",
    "sợ",
    "so",
    "lo",
    "worried",
    "nervous",
  ],
  general_luck: [],
};

const LOC_WISH_CATEGORY_PRIORITY: OngDiaLocCategory[] = [
  "lost_keys",
  "exam_test",
  "health_body",
  "confidence",
  "shop_peace",
  "family_home",
  "money_tip",
];

function detectLocWishCategory(wish: string): OngDiaLocCategory {
  const normalizedWish = normalizeLocWishText(wish);

  return (
    LOC_WISH_CATEGORY_PRIORITY.find((category) =>
      LOC_WISH_CATEGORY_KEYWORDS[category].some((keyword) =>
        hasLocWishKeyword(normalizedWish, keyword)
      )
    ) ?? "general_luck"
  );
}

function detectPreferredLocReadingId(
  wish: string,
  category: OngDiaLocCategory
) {
  if (category !== "exam_test") return null;

  const normalizedWish = normalizeLocWishText(wish);
  const drivingKeywords = [
    "driving test",
    "road test",
    "pass the driving test",
    "license test",
    "bằng lái",
    "bang lai",
    "thi lái xe",
    "thi lai xe",
    "thi bằng lái",
    "thi bang lai",
    "đậu bằng lái",
    "dau bang lai",
  ];

  return drivingKeywords.some((keyword) =>
    hasLocWishKeyword(normalizedWish, keyword)
  )
    ? "thi-lai-xe"
    : null;
}

function hasLocWishKeyword(normalizedWish: string, keyword: string) {
  const normalizedKeyword = normalizeLocWishText(keyword);
  if (!normalizedKeyword) return false;

  if (normalizedKeyword.includes(" ")) {
    return normalizedWish.includes(normalizedKeyword);
  }

  return normalizedWish.split(" ").includes(normalizedKeyword);
}

function normalizeLocWishText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function chooseLocReading(
  category: OngDiaLocCategory,
  seed: string,
  preferredReadingId: string | null = null
): OngDiaLocReading {
  const categoryReadings = ONG_DIA_LOC_READINGS.filter(
    (reading) => reading.category === category
  );
  const fallbackReadings = ONG_DIA_LOC_READINGS.filter(
    (reading) => reading.category === "general_luck"
  );
  const readings = categoryReadings.length
    ? categoryReadings
    : fallbackReadings.length
      ? fallbackReadings
      : ONG_DIA_LOC_READINGS;
  const preferredReading = preferredReadingId
    ? readings.find((reading) => reading.id === preferredReadingId)
    : null;

  if (preferredReading) {
    return preferredReading;
  }

  return (
    readings[Math.abs(hashString(`${category}:${seed}`)) % readings.length] ??
    readings[0] ??
    ONG_DIA_LOC_READINGS[0]
  );
}

function getLocReadingById(readingId: string) {
  return (
    ONG_DIA_LOC_READINGS.find((reading) => reading.id === readingId) ??
    ONG_DIA_LOC_READINGS[0]
  );
}

function chooseStickForTopic(topic: XinXamTopic) {
  const candidates = LOCAL_XIN_XAM_SEED_STICKS.filter(
    (stick) => stick.topic === topic
  );
  const fallback = LOCAL_XIN_XAM_SEED_STICKS[0];
  const periodKind = candidates[0]?.periodKind ?? fallback.periodKind;
  const periodKey = getPeriodKey(periodKind);
  const index = Math.abs(hashString(`${topic}:${periodKey}`)) % candidates.length;
  return candidates[index] ?? fallback;
}

function getDrawMemoryKey(topic: XinXamTopic, periodKey: string) {
  return `${topic}:${periodKey}`;
}

function getTopicLabel(topic: XinXamTopic) {
  return XIN_XAM_TOPICS.find((option) => option.key === topic)?.label ?? "Tiệm";
}

function getPeriodKey(periodKind: "day" | "week") {
  const now = new Date();
  if (periodKind === "day") return getLocalDayKey(now);
  return getLocalWeekKey(now);
}

function getLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalWeekKey(date: Date) {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const sevenDayIndex = Math.floor(localDate.getTime() / (7 * 86400000));
  return `7D-${sevenDayIndex}`;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
