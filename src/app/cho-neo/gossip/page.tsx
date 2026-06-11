"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

type ConversationMessage = {
  name: string;
  text: string;
};

const FRONT_COUNTER_MESSAGE_LIMIT = 180;
const FOUNDING_PASSCODE = "CHO-NEO-FOUNDERS";
const FOUNDING_PASS_UNLOCKED_KEY = "choNeoFoundingPassUnlocked";
const FOUNDING_PASS_NAME_KEY = "choNeoFoundingPassDisplayName";

const tables = [
  {
    name: "Front Counter",
    count: 5,
    action: "people talking",
    topic: "Are chrome prices dropping?",
    status: "Lively",
    initials: ["Mai", "TN", "Vy", "KP", "An"],
    tone: "rose",
    note: "Quick takes while someone is waiting on coffee and the next client.",
    messages: [
      { name: "Mai", text: "Chrome still sells, but clients ask price first now." },
      { name: "Bao", text: "Supply cost is not the only issue. Time is the killer." },
      { name: "Vy", text: "In my shop, chrome is still strong for short sets." },
      { name: "TN", text: "Receipts matter. People compare everything now." },
    ],
  },
  {
    name: "Corner Table",
    count: 3,
    action: "people talking",
    topic: "Slow June in Calgary?",
    status: "Open",
    initials: ["MT", "Kim", "LD"],
    tone: "violet",
    note: "Local shop rhythm, walk-ins, bookings, and the weather nobody asked for.",
    messages: [
      { name: "MT", text: "June always feels sleepy until grad sets come in all at once." },
      { name: "Kim", text: "Walk-ins are slower, but regulars are still booking fills." },
      { name: "LD", text: "Calgary weather decides half our appointment book." },
    ],
  },
  {
    name: "Window Seat",
    count: 2,
    action: "people talking",
    topic: "London salons hiring?",
    status: "Quiet",
    initials: ["Vy", "Han"],
    tone: "cyan",
    note: "Smaller city check-ins, work leads, and soft advice from across the room.",
    messages: [
      { name: "Vy", text: "Two salons near me are hiring, but everyone wants weekends covered." },
      { name: "Han", text: "Ask about product split before you agree. Learned that one." },
    ],
  },
  {
    name: "Big Table",
    count: 6,
    action: "people talking",
    topic: "Best builder gel right now?",
    status: "Lively",
    initials: ["Anh", "Bao", "Nhi", "SL", "PQ", "TV"],
    tone: "gold",
    note: "Product opinions, lamp gossip, application notes, and receipts if you have them.",
    messages: [
      { name: "Anh", text: "Builder gel depends on your prep. No magic bottle fixes lifting." },
      { name: "Bao", text: "The popular one is good, but the viscosity runs warm." },
      { name: "Nhi", text: "Clients like strength, but they hate thick sidewalls." },
      { name: "SL", text: "I need brands that ship consistently more than hype." },
    ],
  },
  {
    name: "Quiet Table",
    count: 2,
    action: "people listening",
    topic: "Owner stress and staffing",
    status: "Listening",
    initials: ["Linh", "Duc"],
    tone: "green",
    note: "Lower voices for owner pressure, team tension, and staying kind under load.",
    messages: [
      { name: "Linh", text: "Staffing gets heavy when everyone is tired but nobody says it." },
      { name: "Duc", text: "Clear schedule rules saved us more drama than any meeting." },
      { name: "Linh", text: "I am trying to fix the system before blaming people." },
    ],
  },
];

const rules = [
  "Talk shop, share receipts, and help each other leave smarter.",
  "No supplier spam.",
  "No personal attacks.",
  "No political baiting or national-label insults.",
  "No doxxing or exposing private client/staff details.",
  "Product talk is allowed when useful, not when blasted like an ad.",
];

const hostTools = ["report", "hide", "remove", "member identity"];

export default function ChoNeoGossipPage() {
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [frontCounterMessages, setFrontCounterMessages] = useState<
    ConversationMessage[]
  >(() => tables[0].messages);
  const [frontCounterDraft, setFrontCounterDraft] = useState("");
  const [foundingPassUnlocked, setFoundingPassUnlocked] = useState(false);
  const [foundingDisplayName, setFoundingDisplayName] = useState("");
  const [foundingPassNameDraft, setFoundingPassNameDraft] = useState("");
  const [foundingPasscodeDraft, setFoundingPasscodeDraft] = useState("");
  const [foundingPassError, setFoundingPassError] = useState<string | null>(
    null
  );
  const selectedTable = useMemo(
    () => tables.find((table) => table.name === selectedTableName) ?? null,
    [selectedTableName]
  );
  const isFrontCounter = selectedTable?.name === "Front Counter";
  const selectedMessages = isFrontCounter
    ? frontCounterMessages
    : selectedTable?.messages ?? [];
  const remainingFrontCounterCharacters =
    FRONT_COUNTER_MESSAGE_LIMIT - frontCounterDraft.length;
  const canSubmitFrontCounterMessage = frontCounterDraft.trim().length > 0;
  const canTryFoundingPass =
    foundingPassNameDraft.trim().length > 0 &&
    foundingPasscodeDraft.trim().length > 0;

  useEffect(() => {
    const savedUnlocked =
      localStorage.getItem(FOUNDING_PASS_UNLOCKED_KEY) === "true";
    const savedName = localStorage.getItem(FOUNDING_PASS_NAME_KEY) ?? "";

    if (savedUnlocked && savedName.trim()) {
      setFoundingPassUnlocked(true);
      setFoundingDisplayName(savedName);
      setFoundingPassNameDraft(savedName);
    }
  }, []);

  function handleFrontCounterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = frontCounterDraft.trim();

    if (!text) {
      return;
    }

    setFrontCounterMessages((messages) => [
      ...messages,
      { name: foundingDisplayName || "You", text },
    ]);
    setFrontCounterDraft("");
  }

  function handleFoundingPassSubmit() {
    const displayName = foundingPassNameDraft.trim();
    const passcode = foundingPasscodeDraft.trim();

    if (!displayName || passcode !== FOUNDING_PASSCODE) {
      setFoundingPassError("That pass does not open this table yet.");
      return;
    }

    localStorage.setItem(FOUNDING_PASS_UNLOCKED_KEY, "true");
    localStorage.setItem(FOUNDING_PASS_NAME_KEY, displayName);
    setFoundingPassUnlocked(true);
    setFoundingDisplayName(displayName);
    setFoundingPassError(null);
    setFoundingPasscodeDraft("");
  }

  function openTable(tableName: string) {
    setSelectedTableName(tableName);
  }

  function handleTableKeyDown(
    event: KeyboardEvent<HTMLElement>,
    tableName: string
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTable(tableName);
    }
  }

  function handleFoundingPassKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleFoundingPassSubmit();
    }
  }

  return (
    <main className="cafe-page">
      <div className="room-glow" />
      <div className="floor-grid" />

      <section className="cafe-shell" aria-labelledby="gossip-title">
        <header className="cafe-hero">
          <div>
            <p className="eyebrow">Cho Neo Village</p>
            <h1 id="gossip-title">Gossip Café — 18 inside</h1>
            <p className="subtitle">
              Salon talk, market whispers, and stories from the diaspora beauty floor.
              People drift between small tables instead of shouting across one big room.
            </p>
          </div>

          <Link className="back-link" href="/cho-neo">
            <span className="back-kicker">Cho Neo Village</span>
            <span>Back to Village Square</span>
          </Link>
        </header>

        <section
          className={`room-scene ${selectedTable ? "room-scene-focused" : ""}`}
          aria-label="Gossip Café table clusters"
        >
          <div className="counter" aria-hidden="true">
            <span className="counter-light" />
            <strong>Order here, talk softly, bring receipts.</strong>
          </div>

          {selectedTable ? (
            <article className={`table-detail table-${selectedTable.tone}`}>
              <span className="table-glow" />
              <div className="detail-table-plate" aria-hidden="true">
                {selectedTable.initials.map((initial, seatIndex) => (
                  <span key={`${initial}-${seatIndex}`} />
                ))}
              </div>

              <div className="detail-panel">
                <div className="detail-heading">
                  <div>
                    <p>{selectedTable.status} table</p>
                    <h2>{selectedTable.name}</h2>
                  </div>
                  <strong>
                    {selectedTable.count} {selectedTable.action}
                  </strong>
                </div>

                <p className="topic">Topic: “{selectedTable.topic}”</p>

                <div className="member-row detail-members" aria-label={`${selectedTable.name} seated members`}>
                  {selectedTable.initials.map((initial) => (
                    <span key={initial}>{initial}</span>
                  ))}
                </div>

                <div className="mock-thread" aria-label={`${selectedTable.name} sample conversation`}>
                  {selectedMessages.map((message, index) => (
                    <div
                      className={`thread-message ${
                        index % 2 ? "thread-message-right" : "thread-message-left"
                      }`}
                      key={`${message.name}-${message.text}`}
                    >
                      <small>{message.name}</small>
                      <p>{message.text}</p>
                    </div>
                  ))}
                </div>

                {isFrontCounter ? (
                  <form
                    className="conversation-form"
                    onSubmit={handleFrontCounterSubmit}
                  >
                    <p className="prototype-note">
                      Prototype table. Real member identity and moderation come
                      later. Messages are not saved yet and reset on refresh.
                    </p>
                    <p className="prototype-note">
                      Temporary Founding Pass for prototype testing. Real
                      sign-in comes later.
                    </p>
                    {foundingPassUnlocked ? (
                      <p className="posting-as">
                        Posting as <strong>{foundingDisplayName}</strong>
                      </p>
                    ) : (
                      <div className="founding-pass">
                        <div>
                          <strong>Founding Pass</strong>
                          <p>Unlock posting at the Front Counter.</p>
                        </div>
                        <label htmlFor="founding-display-name">
                          Display name
                        </label>
                        <input
                          id="founding-display-name"
                          maxLength={32}
                          onChange={(event) =>
                            setFoundingPassNameDraft(event.target.value)
                          }
                          placeholder="Mai Calgary"
                          type="text"
                          value={foundingPassNameDraft}
                        />
                        <label htmlFor="founding-passcode">
                          Invite passcode
                        </label>
                        <input
                          id="founding-passcode"
                          onKeyDown={handleFoundingPassKeyDown}
                          onChange={(event) =>
                            setFoundingPasscodeDraft(event.target.value)
                          }
                          placeholder="CHO-NEO-..."
                          type="text"
                          value={foundingPasscodeDraft}
                        />
                        {foundingPassError ? (
                          <p className="pass-error">{foundingPassError}</p>
                        ) : null}
                        <button
                          disabled={!canTryFoundingPass}
                          type="button"
                          onClick={handleFoundingPassSubmit}
                        >
                          Unlock posting
                        </button>
                      </div>
                    )}
                    <label htmlFor="front-counter-message">
                      Front Counter conversation
                    </label>
                    <div className="message-row">
                      <input
                        disabled={!foundingPassUnlocked}
                        id="front-counter-message"
                        maxLength={FRONT_COUNTER_MESSAGE_LIMIT}
                        onChange={(event) =>
                          setFrontCounterDraft(event.target.value)
                        }
                        placeholder={
                          foundingPassUnlocked
                            ? "Add a short café note..."
                            : "Unlock the Founding Pass to post..."
                        }
                        type="text"
                        value={frontCounterDraft}
                      />
                      <button
                        disabled={
                          !foundingPassUnlocked || !canSubmitFrontCounterMessage
                        }
                        type="submit"
                      >
                        Post
                      </button>
                    </div>
                    <p className="character-count">
                      {remainingFrontCounterCharacters} characters left
                    </p>
                  </form>
                ) : null}

                <button
                  className="leave-button"
                  type="button"
                  onClick={() => setSelectedTableName(null)}
                >
                  Back to all tables
                </button>
              </div>
            </article>
          ) : (
            <div className="table-map">
              {tables.map((table) => (
                <article
                  aria-label={`Open ${table.name}`}
                  className={`table-cluster table-${table.tone}`}
                  key={table.name}
                  onClick={() => openTable(table.name)}
                  onKeyDown={(event) => handleTableKeyDown(event, table.name)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="table-glow" />
                  <div className="table-plate" aria-hidden="true">
                    {table.initials.map((initial, seatIndex) => (
                      <span key={`${initial}-${seatIndex}`} />
                    ))}
                  </div>

                  <div className="table-card">
                    <div className="table-heading">
                      <div>
                        <p>{table.action}</p>
                        <h2>{table.name}</h2>
                      </div>
                      <span>{table.status}</span>
                    </div>

                    <p className="topic">Topic: “{table.topic}”</p>
                    <p className="note">{table.note}</p>

                    <div className="member-row" aria-label={`${table.name} members`}>
                      {table.initials.map((initial) => (
                        <span key={initial}>{initial}</span>
                      ))}
                    </div>

                    <div className="table-footer">
                      <strong>
                        {table.count} {table.action}
                      </strong>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTable(table.name);
                        }}
                      >
                        Join table
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="house-rules" aria-label="Table etiquette">
          <div className="rules-heading">
            <p className="eyebrow">House Rules</p>
            <h2>Table Etiquette</h2>
            <p>
              Warm room, sharp boundaries. Gossip Café works when the talk stays
              useful, funny, or kind.
            </p>
          </div>
          <div className="rules-body">
            <ul>
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <div className="host-note">
              <strong>Village host tools coming later</strong>
              <p>No buttons yet. Future tools include:</p>
              <div>
                {hostTools.map((tool) => (
                  <span key={tool}>{tool}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>

      <style>{`
        .cafe-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 16% 14%, rgba(251, 191, 36, 0.25), transparent 28%),
            radial-gradient(circle at 84% 12%, rgba(244, 114, 182, 0.16), transparent 26%),
            linear-gradient(180deg, #101224 0%, #21162c 42%, #321b29 72%, #151015 100%);
        }

        .room-glow,
        .floor-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .room-glow {
          background:
            radial-gradient(ellipse at 50% 20%, rgba(253, 230, 138, 0.16), transparent 42%),
            radial-gradient(ellipse at 12% 76%, rgba(244, 114, 182, 0.12), transparent 34%),
            radial-gradient(ellipse at 88% 78%, rgba(45, 212, 191, 0.1), transparent 34%);
        }

        .floor-grid {
          top: 38%;
          transform: perspective(620px) rotateX(62deg);
          transform-origin: bottom center;
          background-image:
            linear-gradient(rgba(253, 230, 138, 0.13) 1px, transparent 1px),
            linear-gradient(90deg, rgba(253, 230, 138, 0.1) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 24%, black 100%);
          opacity: 0.5;
        }

        .cafe-shell {
          position: relative;
          z-index: 1;
          width: min(1240px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .cafe-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 4px 2px 0;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(42px, 7.6vw, 86px);
          line-height: 0.9;
          letter-spacing: -0.045em;
          text-wrap: balance;
        }

        .subtitle {
          max-width: 780px;
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.82);
          font-size: clamp(16px, 1.8vw, 21px);
          line-height: 1.5;
        }

        .back-link {
          flex: 0 0 auto;
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          min-height: 50px;
          padding: 7px 15px;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 14px;
          line-height: 1.1;
          font-weight: 950;
          text-decoration: none;
          box-shadow: 0 0 34px rgba(251, 191, 36, 0.2);
        }

        .back-kicker {
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.68;
        }

        .room-scene {
          position: relative;
          overflow: hidden;
          min-height: 720px;
          margin-top: 22px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 34px;
          background:
            radial-gradient(circle at 50% 22%, rgba(253, 230, 138, 0.18), transparent 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.04)),
            rgba(8, 13, 28, 0.58);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }

        .room-scene::before,
        .room-scene::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -120px;
          width: min(1040px, 110%);
          height: 520px;
          transform: translateX(-50%) rotate(-2deg);
          border-radius: 50%;
          background: rgba(75, 47, 60, 0.82);
          box-shadow: inset 0 0 48px rgba(0, 0, 0, 0.24);
        }

        .room-scene::after {
          bottom: 86px;
          width: min(760px, 76%);
          height: 300px;
          transform: translateX(-50%) rotate(2deg);
          background: rgba(101, 64, 75, 0.76);
          border: 1px solid rgba(253, 230, 138, 0.14);
        }

        .counter {
          position: absolute;
          left: 50%;
          top: 24px;
          z-index: 3;
          width: min(620px, calc(100% - 36px));
          min-height: 92px;
          display: grid;
          place-items: center;
          transform: translateX(-50%);
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 24px;
          background:
            repeating-linear-gradient(90deg, rgba(17, 24, 39, 0.8) 0 28px, rgba(253, 230, 138, 0.78) 28px 46px),
            rgba(8, 13, 28, 0.72);
          box-shadow: 0 18px 54px rgba(0, 0, 0, 0.34);
        }

        .counter-light {
          position: absolute;
          inset: -34px 18% auto;
          height: 90px;
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.32);
          filter: blur(24px);
        }

        .counter strong {
          position: relative;
          padding: 10px 14px;
          border-radius: 999px;
          color: #111827;
          background: rgba(255, 247, 237, 0.88);
          font-size: 13px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .table-map {
          position: relative;
          z-index: 4;
          min-height: 720px;
        }

        .table-cluster {
          position: absolute;
          width: 292px;
          cursor: pointer;
          outline: none;
          transition: filter 160ms ease, transform 160ms ease;
        }

        .table-cluster:nth-child(1) { left: 6%; top: 154px; }
        .table-cluster:nth-child(2) { left: 37%; top: 166px; }
        .table-cluster:nth-child(3) { right: 6%; top: 154px; }
        .table-cluster:nth-child(4) { left: 18%; bottom: 62px; width: 340px; }
        .table-cluster:nth-child(5) { right: 16%; bottom: 72px; width: 320px; }

        .table-cluster:hover {
          filter: drop-shadow(0 18px 34px rgba(0, 0, 0, 0.34));
          transform: translateY(-4px);
        }

        .table-cluster:focus-visible {
          border-radius: 28px;
          outline: 3px solid rgba(253, 230, 138, 0.88);
          outline-offset: 7px;
        }

        .table-glow {
          position: absolute;
          inset: 10px 24px auto;
          height: 112px;
          border-radius: 999px;
          opacity: 0.36;
          filter: blur(24px);
          pointer-events: none;
        }

        .table-rose .table-glow { background: #fda4af; }
        .table-violet .table-glow { background: #c4b5fd; }
        .table-cyan .table-glow { background: #67e8f9; }
        .table-gold .table-glow { background: #fcd34d; }
        .table-green .table-glow { background: #86efac; }

        .table-plate {
          position: relative;
          z-index: 2;
          width: 132px;
          height: 78px;
          margin: 0 auto -20px;
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 44%, rgba(253, 230, 138, 0.18), transparent 44%),
            rgba(101, 64, 75, 0.92);
          box-shadow:
            0 16px 34px rgba(0, 0, 0, 0.28),
            inset 0 0 28px rgba(0, 0, 0, 0.2);
          pointer-events: none;
        }

        .table-plate span {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff7ed, #fcd34d);
          box-shadow: 0 0 18px rgba(251, 191, 36, 0.24);
        }

        .table-plate span:nth-child(1) { left: 10px; top: 28px; }
        .table-plate span:nth-child(2) { left: 38px; top: 4px; }
        .table-plate span:nth-child(3) { right: 38px; top: 4px; }
        .table-plate span:nth-child(4) { right: 10px; top: 28px; }
        .table-plate span:nth-child(5) { left: 38px; bottom: 2px; }
        .table-plate span:nth-child(6) { right: 38px; bottom: 2px; }

        .table-card {
          position: relative;
          z-index: 1;
          padding: 18px;
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

        .table-card::after {
          content: "Tap anywhere to enter";
          display: block;
          margin-top: 12px;
          color: rgba(253, 230, 138, 0.76);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .room-scene-focused {
          min-height: 650px;
          display: grid;
          place-items: center;
          padding: 28px;
        }

        .room-scene-focused .counter {
          opacity: 0.38;
        }

        .table-detail {
          position: relative;
          z-index: 5;
          width: min(780px, 100%);
          margin-top: 92px;
        }

        .detail-table-plate {
          position: relative;
          z-index: 2;
          width: 240px;
          height: 124px;
          margin: 0 auto -34px;
          border: 1px solid rgba(253, 230, 138, 0.25);
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 44%, rgba(253, 230, 138, 0.2), transparent 44%),
            rgba(101, 64, 75, 0.94);
          box-shadow:
            0 18px 42px rgba(0, 0, 0, 0.3),
            inset 0 0 34px rgba(0, 0, 0, 0.22);
        }

        .detail-table-plate span {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff7ed, #fcd34d);
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.28);
        }

        .detail-table-plate span:nth-child(1) { left: 18px; top: 50px; }
        .detail-table-plate span:nth-child(2) { left: 70px; top: 8px; }
        .detail-table-plate span:nth-child(3) { right: 70px; top: 8px; }
        .detail-table-plate span:nth-child(4) { right: 18px; top: 50px; }
        .detail-table-plate span:nth-child(5) { left: 72px; bottom: 4px; }
        .detail-table-plate span:nth-child(6) { right: 72px; bottom: 4px; }

        .detail-panel {
          position: relative;
          z-index: 1;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 30px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.05)),
            rgba(8, 13, 28, 0.78);
          box-shadow:
            0 22px 70px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(14px);
        }

        .detail-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .detail-heading p {
          margin: 0 0 8px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .detail-heading h2 {
          margin: 0;
          font-size: clamp(36px, 5vw, 62px);
          line-height: 0.9;
          letter-spacing: -0.045em;
        }

        .detail-heading strong {
          flex: 0 0 auto;
          padding: 8px 11px;
          border-radius: 999px;
          color: #111827;
          background: rgba(253, 230, 138, 0.92);
          font-size: 12px;
          font-weight: 950;
        }

        .detail-members {
          margin-top: 18px;
        }

        .mock-thread {
          display: grid;
          gap: 12px;
          margin-top: 20px;
        }

        .thread-message {
          width: min(82%, 430px);
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 247, 237, 0.11);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
        }

        .thread-message-left {
          justify-self: start;
          border-radius: 18px 18px 18px 6px;
        }

        .thread-message-right {
          justify-self: end;
          border-radius: 18px 18px 6px 18px;
          background: rgba(253, 230, 138, 0.16);
          border-color: rgba(253, 230, 138, 0.18);
        }

        .thread-message small {
          display: block;
          color: #fde68a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.06em;
        }

        .thread-message p {
          margin: 6px 0 0;
          color: rgba(255, 247, 237, 0.84);
          font-size: 14px;
          line-height: 1.45;
        }

        .conversation-form {
          display: grid;
          gap: 10px;
          margin-top: 20px;
          padding: 14px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 22px;
          background:
            radial-gradient(circle at 12% 0%, rgba(253, 230, 138, 0.14), transparent 34%),
            rgba(255, 247, 237, 0.08);
        }

        .prototype-note {
          margin: 0;
          color: rgba(255, 247, 237, 0.72);
          font-size: 13px;
          line-height: 1.4;
        }

        .posting-as {
          margin: 0;
          padding: 10px 12px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 16px;
          color: rgba(255, 247, 237, 0.78);
          background: rgba(253, 230, 138, 0.1);
          font-size: 13px;
          line-height: 1.4;
        }

        .posting-as strong {
          color: #fde68a;
        }

        .founding-pass {
          display: grid;
          gap: 9px;
          padding: 14px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 20px;
          background:
            radial-gradient(circle at 12% 0%, rgba(253, 230, 138, 0.16), transparent 34%),
            rgba(8, 13, 28, 0.42);
        }

        .founding-pass strong {
          color: #fde68a;
          font-size: 14px;
          font-weight: 950;
        }

        .founding-pass p {
          margin: 4px 0 0;
          color: rgba(255, 247, 237, 0.68);
          font-size: 13px;
          line-height: 1.4;
        }

        .founding-pass label {
          margin-top: 3px;
        }

        .founding-pass input {
          width: 100%;
          min-height: 40px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          padding: 0 13px;
          color: #fff7ed;
          background: rgba(8, 13, 28, 0.64);
          font: inherit;
          outline: none;
        }

        .founding-pass input::placeholder {
          color: rgba(255, 247, 237, 0.42);
        }

        .founding-pass input:focus {
          border-color: rgba(253, 230, 138, 0.66);
          box-shadow: 0 0 0 3px rgba(253, 230, 138, 0.12);
        }

        .founding-pass button {
          min-height: 40px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 13px;
          font-weight: 950;
        }

        .founding-pass button:disabled {
          cursor: not-allowed;
          color: rgba(255, 247, 237, 0.54);
          background: rgba(255, 255, 255, 0.14);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .pass-error {
          color: #fecdd3 !important;
          font-weight: 850;
        }

        .conversation-form label {
          color: #fde68a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .message-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
        }

        .message-row input {
          width: 100%;
          min-height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          padding: 0 14px;
          color: #fff7ed;
          background: rgba(8, 13, 28, 0.62);
          font: inherit;
          outline: none;
        }

        .message-row input::placeholder {
          color: rgba(255, 247, 237, 0.44);
        }

        .message-row input:focus {
          border-color: rgba(253, 230, 138, 0.66);
          box-shadow: 0 0 0 3px rgba(253, 230, 138, 0.12);
        }

        .message-row input:disabled {
          cursor: not-allowed;
          color: rgba(255, 247, 237, 0.48);
          background: rgba(255, 255, 255, 0.08);
        }

        .message-row button {
          min-height: 42px;
          padding: 0 16px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 13px;
          font-weight: 950;
        }

        .message-row button:disabled {
          cursor: not-allowed;
          color: rgba(255, 247, 237, 0.54);
          background: rgba(255, 255, 255, 0.14);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .character-count {
          justify-self: end;
          margin: -2px 4px 0 0;
          color: rgba(255, 247, 237, 0.56);
          font-size: 12px;
          font-weight: 850;
        }

        .leave-button {
          min-height: 40px;
          margin-top: 20px;
          padding: 0 14px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 13px;
          font-weight: 950;
        }

        .table-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .table-heading p {
          margin: 0 0 8px;
          color: #fde68a;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .table-heading h2 {
          margin: 0;
          font-size: clamp(25px, 3vw, 38px);
          line-height: 0.95;
          letter-spacing: -0.035em;
        }

        .table-heading > span {
          flex: 0 0 auto;
          padding: 7px 10px;
          border-radius: 999px;
          color: #111827;
          background: rgba(253, 230, 138, 0.92);
          font-size: 12px;
          font-weight: 950;
        }

        .topic {
          margin: 16px 0 0;
          color: #fff7ed;
          font-size: 15px;
          font-weight: 850;
          line-height: 1.35;
        }

        .note {
          margin: 10px 0 0;
          color: rgba(255, 247, 237, 0.68);
          font-size: 13px;
          line-height: 1.45;
        }

        .member-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 15px;
        }

        .member-row span {
          display: grid;
          place-items: center;
          min-width: 31px;
          height: 31px;
          padding: 0 8px;
          border-radius: 999px;
          color: #111827;
          background: linear-gradient(180deg, #fff7ed, #fcd34d);
          font-size: 11px;
          font-weight: 950;
          box-shadow: 0 0 22px rgba(251, 191, 36, 0.18);
        }

        .table-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
        }

        .table-footer strong {
          color: rgba(255, 247, 237, 0.74);
          font-size: 12px;
        }

        .table-footer button {
          min-height: 36px;
          padding: 0 12px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 12px;
          font-weight: 950;
        }

        .house-rules {
          display: grid;
          grid-template-columns: minmax(240px, 0.62fr) minmax(0, 1.38fr);
          gap: 18px;
          margin-top: 16px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 28, 0.62);
          box-shadow:
            0 18px 54px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(12px);
        }

        .rules-heading p:not(.eyebrow) {
          margin: 12px 0 0;
          color: rgba(255, 247, 237, 0.7);
          font-size: 14px;
          line-height: 1.5;
        }

        .house-rules h2 {
          margin: 0;
          font-size: clamp(24px, 3.2vw, 42px);
          line-height: 0.98;
          letter-spacing: -0.035em;
        }

        .rules-body {
          display: grid;
          gap: 12px;
        }

        .house-rules ul {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .house-rules li {
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 247, 237, 0.84);
          font-weight: 850;
        }

        .host-note {
          padding: 14px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 20px;
          background:
            radial-gradient(circle at 10% 0%, rgba(253, 230, 138, 0.14), transparent 34%),
            rgba(253, 230, 138, 0.08);
        }

        .host-note strong {
          color: #fde68a;
          font-size: 13px;
          font-weight: 950;
        }

        .host-note p {
          margin: 6px 0 10px;
          color: rgba(255, 247, 237, 0.68);
          font-size: 13px;
          line-height: 1.4;
        }

        .host-note div {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .host-note span {
          padding: 6px 9px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(8, 13, 28, 0.42);
          color: rgba(255, 247, 237, 0.78);
          font-size: 12px;
          font-weight: 850;
        }

        @media (max-width: 1080px) {
          .room-scene,
          .table-map {
            min-height: auto;
          }

          .room-scene {
            padding: 18px;
            overflow: visible;
          }

          .counter,
          .table-cluster {
            position: relative;
            left: auto !important;
            right: auto !important;
            top: auto !important;
            bottom: auto !important;
            width: 100% !important;
            transform: none;
          }

          .counter {
            z-index: 4;
            margin-bottom: 18px;
          }

          .table-map {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }

          .table-cluster {
            min-width: 0;
          }

          .table-cluster:hover {
            transform: translateY(-2px);
          }

          .room-scene-focused {
            display: block;
            min-height: auto;
          }

          .table-detail {
            margin: 118px auto 0;
          }
        }

        @media (max-width: 980px) {
          .cafe-shell {
            padding: 18px 14px;
          }

          .cafe-hero,
          .house-rules {
            grid-template-columns: 1fr;
          }

          .cafe-hero {
            flex-direction: column;
          }

          .room-scene {
            border-radius: 28px;
          }

          .house-rules {
            gap: 14px;
          }
        }

        @media (max-width: 720px) {
          .cafe-shell {
            padding: 16px 12px 22px;
          }

          h1 {
            font-size: clamp(38px, 13vw, 58px);
          }

          .subtitle {
            font-size: 15px;
          }

          .room-scene {
            margin-top: 16px;
            padding: 14px;
            border-radius: 24px;
          }

          .room-scene::before {
            bottom: -160px;
            height: 420px;
          }

          .room-scene::after {
            display: none;
          }

          .counter {
            min-height: 78px;
            border-radius: 20px;
          }

          .counter strong {
            width: calc(100% - 24px);
            border-radius: 18px;
            text-align: center;
            font-size: 11px;
            line-height: 1.35;
          }

          .table-map,
          .house-rules ul {
            grid-template-columns: 1fr;
          }

          .back-link {
            width: 100%;
          }

          .table-card,
          .detail-panel,
          .house-rules {
            border-radius: 22px;
          }

          .table-card {
            padding: 16px;
          }

          .table-plate {
            width: 118px;
            height: 70px;
            margin-bottom: -16px;
          }

          .room-scene-focused {
            padding: 14px;
          }

          .room-scene-focused .counter {
            display: none;
          }

          .table-detail {
            margin: 0 auto;
          }

          .detail-table-plate {
            width: 190px;
            height: 104px;
            margin-bottom: -26px;
          }

          .detail-panel {
            padding: 18px;
          }

          .table-heading,
          .table-footer,
          .detail-heading {
            flex-direction: column;
            align-items: flex-start;
          }

          .table-footer button,
          .leave-button,
          .message-row button,
          .founding-pass button {
            width: 100%;
          }

          .message-row {
            grid-template-columns: 1fr;
          }

          .thread-message {
            width: 100%;
          }

          .house-rules {
            padding: 16px;
          }

          .host-note div {
            align-items: stretch;
          }
        }
      `}</style>
    </main>
  );
}
