"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChoNeoBetaFeedback } from "@/components/cho-neo/ChoNeoBetaFeedback";
import { useChoNeoMember } from "@/components/cho-neo/ChoNeoMemberProvider";
import {
  CHO_NEO_AVATARS,
  type ChoNeoIdentity,
  getAvatarById,
  getChoNeoIdentity,
  saveChoNeoIdentity,
} from "@/lib/cho-neo/avatar-identity";
import { isVerifiedChoNeoMemberProfile } from "@/lib/cho-neo/member-identity";
import {
  FRONT_COUNTER_MESSAGE_CAP,
  FRONT_COUNTER_MESSAGE_TEXT_LIMIT,
  type FrontCounterMessage,
  type FrontCounterSeat,
  createFrontCounterMessage,
  createFrontCounterSeat,
  fetchHostReviewFrontCounterMessages,
  fetchSharedFrontCounterMessages,
  hideSharedFrontCounterMessage,
  isSharedFrontCounterMessageId,
  markSharedFrontCounterMessageReviewed,
  postSharedFrontCounterMessage,
  readFrontCounterState,
  removeSharedFrontCounterMessage,
  reportSharedFrontCounterMessage,
  saveFrontCounterSeat,
  saveFrontCounterState,
  unhideSharedFrontCounterMessage,
} from "@/lib/cho-neo/gossip-front-counter";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";
import { createClient } from "@/lib/supabase-browser";

type ConversationMessage = {
  author?: {
    avatarSrc?: string;
    mood?: string;
    nickname: string;
  };
  name: string;
  text: string;
};

type TableNotesByName = Record<string, ConversationMessage[]>;
type FrontCounterMemoryMode = "local" | "shared";
type FrontCounterModerationAction =
  | "hide"
  | "markReviewed"
  | "remove"
  | "unhide";
type ChoNeoAvatarProfile = {
  avatarId: string;
  avatarSrc: string;
  nickname: string;
  mood: string;
  updatedAt: string;
};

function TableHostNudge({
  message,
  onClose,
  visible,
}: {
  message: string;
  onClose: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <aside className="table-host-nudge" aria-live="polite">
      <div>
        <strong>Chủ Bàn nhắc nhẹ</strong>
        <p>{message}</p>
      </div>
      <button aria-label="Đóng lời nhắc Chủ Bàn" onClick={onClose} type="button">
        ×
      </button>
    </aside>
  );
}

function CompactTableHeader({
  countLabel,
  onBack,
  onEnter,
}: {
  countLabel: string;
  onBack: () => void;
  onEnter?: () => void;
}) {
  return (
    <div className="compact-table-header">
      <button className="compact-table-back" onClick={onBack} type="button">
        ← Quán Tám
      </button>
      {onEnter ? (
        <button className="compact-table-enter" onClick={onEnter} type="button">
          Vào bàn
          <span>Take a seat</span>
        </button>
      ) : null}
      <span className="compact-table-count">{countLabel}</span>
    </div>
  );
}

function QuanTamTableShell({
  ariaLabel,
  artwork,
  artworkAlt,
  children,
  className,
  countLabel,
  note,
  onBack,
  onEnter,
  subtitle,
  titleEn,
  titleVi,
}: {
  ariaLabel: string;
  artwork?: string | null;
  artworkAlt: string;
  children: ReactNode;
  className?: string;
  countLabel: string;
  note: string;
  onBack: () => void;
  onEnter?: () => void;
  subtitle: string;
  titleEn: string;
  titleVi: string;
}) {
  return (
    <section
      className={`local-table-stage ${className ?? ""}`}
      aria-label={ariaLabel}
    >
      <CompactTableHeader
        countLabel={countLabel}
        onBack={onBack}
        onEnter={onEnter}
      />
      <header className="local-table-heading">
        <div>
          <h2>
            {titleVi}
            <span>{titleEn}</span>
          </h2>
        </div>
      </header>

      <p className="local-table-subtitle">
        {subtitle}
        <span>{note}</span>
      </p>

      {artwork ? (
        <div className="local-table-artwork">
          <img alt={artworkAlt} src={artwork} />
        </div>
      ) : null}

      {children}
    </section>
  );
}

const FRONT_COUNTER_MESSAGE_LIMIT = FRONT_COUNTER_MESSAGE_TEXT_LIMIT;
const FRONT_COUNTER_MIN_MEANINGFUL_CHARACTERS = 3;
const TABLE_NOTE_MESSAGE_LIMIT = FRONT_COUNTER_MESSAGE_TEXT_LIMIT;
const TABLE_NOTE_MIN_MEANINGFUL_CHARACTERS =
  FRONT_COUNTER_MIN_MEANINGFUL_CHARACTERS;
const QUIET_GOSSIP_MOOD = "Muốn tám chút";
const QUIET_GOSSIP_NICKNAME = "Bạn làng";
const QUAN_TAM_DAY_ARTWORK_SRC = "/images/cho-neo/Quan-Tam-Daytime.png";
const QUAN_TAM_NIGHT_ARTWORK_SRC = "/images/cho-neo/quan-tam-gossip.png";
const QUAY_XA_GIAO_DAY_ARTWORK_SRC =
  "/images/cho-neo/Quay-Xa-Giao-Daytime.png";
const QUAY_XA_GIAO_NIGHT_ARTWORK_SRC = "/images/cho-neo/Quay-Xa-Giao.png";
const BAN_CHUYEN_NGHE_DAY_ARTWORK_SRC = "/images/cho-neo/Ban-Chuyen-Nghe-New.png";
const BAN_CHUYEN_NGHE_NIGHT_ARTWORK_SRC =
  "/images/cho-neo/Ban-Chuyen-Nghe-Nighttime.png";
const FRONT_COUNTER_REPORTED_MESSAGES_KEY =
  "choNeoGossipFrontCounterReportedMessagesV1";
const GOSSIP_RULES_ACCEPTED_KEY = "choNeoGossipRulesAcceptedV1";
const CHO_NEO_AVATAR_PROFILE_KEY = "choNeoAvatarProfile";
const FRONT_COUNTER_TALK_EXAMPLES = [
  "Which top coat is behaving today",
  "Slow Tuesday walk-in rhythm",
  "Receipts, prices, and polite client notes",
  "Weather before booking the afternoon",
];
const COLOR_TREND_STAGE_IMAGE_SRC =
  "/images/cho-neo/Ban-Mau-New.png";
const COLOR_TREND_TOPIC_CHIPS = [
  {
    vi: "Khách hỏi hoài",
    en: "Clients keep asking",
    insert: "Khách hỏi gì hoài?",
    tone: "marigold",
  },
  {
    vi: "Hot bất ngờ",
    en: "Surprisingly hot",
    insert: "Món nào hot bất ngờ?",
    tone: "sky",
  },
  {
    vi: "Khách chuộng",
    en: "Surprisingly loved",
    insert: "Khách chuộng gì bất ngờ?",
    tone: "coral",
  },
  {
    vi: "Bling lên",
    en: "Bling is rising",
    insert: "Bling nào đang lên?",
    tone: "magenta",
  },
  {
    vi: "Làm đẹp nhưng lâu",
    en: "Pretty but slow",
    insert: "Design nào đẹp nhưng lâu?",
    tone: "orange",
  },
  {
    vi: "Món đáng chuẩn bị",
    en: "Worth preparing",
    insert: "Món nào đáng chuẩn bị?",
    tone: "turquoise",
  },
  {
    vi: "Gel / dip / acrylic",
    en: "Gel / dip / acrylic looks",
    insert: "Gel/dip/acrylic look nào hot?",
    tone: "purple",
  },
  {
    vi: "Da & undertone",
    en: "Skin tone & undertone",
    insert: "Màu nào hợp da/undertone?",
    tone: "lavender",
  },
];
const COLOR_TREND_CONVERSATION_STARTERS = [
  {
    vi: "Khách hỏi màu gì?",
    en: "",
  },
  {
    vi: "Trend nào lên?",
    en: "",
  },
  {
    vi: "Bling nào hot?",
    en: "",
  },
];
const COLOR_TREND_RULES = [
  {
    vi: "Chia sẻ để học hỏi",
    en: "Share to learn",
  },
  {
    vi: "Khen gu, không chê người",
    en: "Compliment taste, not people",
  },
  {
    vi: "Không spam bán hàng",
    en: "No sales spam",
  },
  {
    vi: "Giữ bàn vui vẻ",
    en: "Keep it friendly",
  },
];
const COLOR_TREND_BLOCKED_SHORT_POSTS = new Set(["hi", "hello", "test"]);
const COLOR_TREND_AD_LANGUAGE = [
  "dm me",
  "message me to buy",
  "best price",
  "wholesale",
];
const COLOR_TREND_UNSAFE_CLAIM_LANGUAGE = [
  "guaranteed cure",
  "medical advice",
  "legal advice",
  "chữa nấm",
  "trị nấm",
];

const LOCAL_TABLE_CONFIG = {
  "shop-talk": {
    topicChips: [
      {
        vi: "Khách khó tính",
        en: "Hard clients",
        insert: "Khách khó tính thì tiệm bạn xử lý sao?",
        tone: "marigold",
      },
      {
        vi: "Giá & thời gian",
        en: "Pricing & time",
        insert: "Giá và thời gian dịch vụ này nên tính sao cho hợp lý?",
        tone: "sky",
      },
      {
        vi: "Ngày bận",
        en: "Busy day",
        insert: "Ngày bận quá thì sắp lịch sao cho tiệm đỡ rối?",
        tone: "coral",
      },
      {
        vi: "Dịch vụ bán chạy",
        en: "Popular services",
        insert: "Dịch vụ nào đang chạy đều ở tiệm bạn?",
        tone: "turquoise",
      },
      {
        vi: "Nhân sự",
        en: "Staffing",
        insert: "Chia ca và giữ nhịp làm việc sao cho đỡ mệt?",
        tone: "purple",
      },
    ],
    emptyState: {
      viTitle: "Bàn nghề đang chờ một câu thật hữu ích.",
      enTitle: "Shop Talk is waiting for one useful note.",
    },
    rules: [
      { vi: "Nói chuyện nghề, không bêu tiệm.", en: "Talk shop, do not shame salons." },
      { vi: "Góp ý có cách làm.", en: "Offer something practical." },
      { vi: "Không spam supplier.", en: "No supplier spam." },
      { vi: "Giữ tên khách và thợ riêng tư.", en: "Keep clients and techs private." },
    ],
    composerPlaceholder: "Góp chuyện nghề...",
    helper: {
      vi: "Nói rõ bối cảnh: khách, giá, lịch, dịch vụ, hay cách tiệm chạy.",
      en: "Share context: clients, pricing, schedule, services, or shop flow.",
    },
    feedLabel: {
      vi: "Chuyện nghề trên bàn",
      en: "Shop talk on the table",
    },
  },
  "vent-table": {
    topicChips: [
      {
        vi: "Xả nhẹ",
        en: "Light vent",
        insert: "Cho xả nhẹ một câu thôi:",
        tone: "marigold",
      },
      {
        vi: "Khách làm chậm",
        en: "Client delay",
        insert: "Hôm nay có chuyện nhỏ nào làm cả tiệm bị chậm?",
        tone: "orange",
      },
      {
        vi: "Ngày mệt",
        en: "Tired day",
        insert: "Ngày hôm nay mệt nhất ở khúc nào?",
        tone: "coral",
      },
      {
        vi: "Cười cho qua",
        en: "Laugh it off",
        insert: "Có chuyện gì buồn cười trong tiệm hôm nay?",
        tone: "sky",
      },
      {
        vi: "Thở rồi làm tiếp",
        en: "Reset",
        insert: "Mình cần thở một chút vì:",
        tone: "lavender",
      },
    ],
    emptyState: {
      viTitle: "Bàn đang nhẹ. Ai mệt thì đặt một câu xuống.",
      enTitle: "The table is light. Leave one short release if you need it.",
    },
    rules: [
      { vi: "Không nêu tên khách, thợ, hay tiệm.", en: "No client, tech, or salon names." },
      { vi: "Xả nhẹ, không trả đũa.", en: "Vent lightly, no revenge." },
      { vi: "Không kỳ thị, hăm dọa, kích động.", en: "No hate, threats, or escalation." },
      { vi: "Kể xong thì để lòng nhẹ hơn.", en: "Leave lighter than you arrived." },
    ],
    composerPlaceholder: "Xả nhẹ một câu...",
    helper: {
      vi: "Viết ngắn, đổi tên chi tiết riêng tư, và giữ bàn không độc.",
      en: "Keep it short, anonymize private details, and keep the table non-toxic.",
    },
    feedLabel: {
      vi: "Tiếng thở ở bàn",
      en: "Light vents at the table",
    },
  },
  "quiet-table": {
    topicChips: [
      {
        vi: "Thở một chút",
        en: "Breathe",
        insert: "Mình đang cần thở một chút vì:",
        tone: "turquoise",
      },
      {
        vi: "Một điều tử tế",
        en: "One kind thing",
        insert: "Hôm nay có một điều tử tế là:",
        tone: "lavender",
      },
      {
        vi: "Sau ca dài",
        en: "After a long shift",
        insert: "Sau ca dài, mình muốn nhắc bản thân:",
        tone: "green",
      },
      {
        vi: "Gửi lại nhẹ nhàng",
        en: "Soft note",
        insert: "Một câu nhẹ để gửi lại bàn:",
        tone: "sky",
      },
      {
        vi: "Ngày mai làm tiếp",
        en: "Tomorrow",
        insert: "Ngày mai mình chỉ cần làm tốt một việc:",
        tone: "marigold",
      },
    ],
    emptyState: {
      viTitle: "Bàn Yên đang còn một chỗ trống.",
      enTitle: "Quiet Table has one soft seat open.",
    },
    rules: [
      { vi: "Không tranh luận ở bàn này.", en: "No debate at this table." },
      { vi: "Không phán xét hay ép lời khuyên.", en: "No judgment or advice-dumping." },
      { vi: "Không kéo drama vào đây.", en: "No drama here." },
      { vi: "Nói nhỏ, để người khác thở.", en: "Speak softly and let others breathe." },
    ],
    composerPlaceholder: "Để lại một câu nhẹ...",
    helper: {
      vi: "Một câu ngắn cũng đủ: điều bạn đang giữ, điều bạn biết ơn, hoặc điều muốn buông.",
      en: "One short note is enough: what you are holding, thankful for, or ready to release.",
    },
    feedLabel: {
      vi: "Ghi chú nhẹ trên bàn",
      en: "Quiet notes on the table",
    },
  },
} as const;

const seededFrontCounterMessages: FrontCounterMessage[] = [
  {
    avatarId: "salon-owner-female",
    createdAt: "2026-06-01T17:00:00.000Z",
    id: "seed-front-counter-1",
    nickname: "Mai",
    reactions: { heart: 2, tea: 1 },
    text: "Chrome still sells, but clients ask price first now.",
  },
  {
    avatarId: "gossip-cafe-regular",
    createdAt: "2026-06-01T17:03:00.000Z",
    id: "seed-front-counter-2",
    nickname: "Bao",
    reactions: { laugh: 1 },
    text: "Supply cost is not the only issue. Time is the killer.",
  },
  {
    avatarId: "nail-tech-female",
    createdAt: "2026-06-01T17:05:00.000Z",
    id: "seed-front-counter-3",
    nickname: "Vy",
    reactions: { heart: 1 },
    text: "In my shop, chrome is still strong for short sets.",
  },
  {
    avatarId: "salon-owner-male",
    createdAt: "2026-06-01T17:08:00.000Z",
    id: "seed-front-counter-4",
    nickname: "TN",
    reactions: { tea: 2 },
    text: "Receipts matter. People compare everything now.",
  },
];

const tables = [
  {
    id: "front-counter",
    legacyName: "Front Counter",
    name: "Front Counter",
    viTitle: "Quầy Xã Giao",
    enTitle: "Social Counter",
    count: 5,
    action: "people talking",
    topic: "Một câu nhanh hôm nay trong tiệm.",
    subtitle: "Một câu nhanh hôm nay trong tiệm.",
    hostNudge:
      "Cứ chào hỏi nhẹ nhàng. Giữ tên khách, tiệm, và thợ riêng tư nha.",
    maxPostChars: FRONT_COUNTER_MESSAGE_LIMIT,
    status: "active",
    tableStatus: "Lively",
    initials: ["Mai", "TN", "Vy", "KP", "An"],
    tone: "rose",
    note: "General daily talk near the counter before the next client sits down.",
    artwork: "/images/cho-neo/Quay-Xa-Giao.png",
    topicChips: [],
    emptyState: {
      viTitle: "Quầy đang yên lúc này.",
      enTitle: "The counter is quiet right now.",
    },
    rules: [],
    composerPlaceholder: "Nói một câu...",
    reactionStyle: "front-counter",
    mode: "shared-front-counter",
    messages: [
      { name: "Mai", text: "Chrome still sells, but clients ask price first now." },
      { name: "Bao", text: "Supply cost is not the only issue. Time is the killer." },
      { name: "Vy", text: "In my shop, chrome is still strong for short sets." },
      { name: "TN", text: "Receipts matter. People compare everything now." },
    ],
  },
  {
    id: "shop-talk",
    legacyName: "Shop Talk",
    name: "Shop Talk",
    viTitle: "Bàn Chuyện Nghề",
    enTitle: "Shop Talk",
    count: 3,
    action: "people talking",
    topic: "Khách, giá, ngày bận, mẹo giữ tiệm chạy êm.",
    subtitle: "Khách, giá, ngày bận, mẹo giữ tiệm chạy êm.",
    hostNudge:
      "Nói chuyện nghề thoải mái. Góp ý có tình, đừng bêu tên ai nha.",
    maxPostChars: 500,
    status: "active",
    tableStatus: "Open",
    initials: ["MT", "Kim", "LD"],
    tone: "violet",
    note: "Salon life, clients, pricing, busy days, and work tips from people who get it.",
    artwork: "/images/cho-neo/Ban-Chuyen-Nghe-New.png",
    topicChips: LOCAL_TABLE_CONFIG["shop-talk"].topicChips,
    emptyState: LOCAL_TABLE_CONFIG["shop-talk"].emptyState,
    rules: LOCAL_TABLE_CONFIG["shop-talk"].rules,
    composerPlaceholder: LOCAL_TABLE_CONFIG["shop-talk"].composerPlaceholder,
    reactionStyle: "generic",
    mode: "local-session",
    messages: [
      { name: "MT", text: "June always feels sleepy until grad sets come in all at once." },
      { name: "Kim", text: "Walk-ins are slower, but regulars are still booking fills." },
      { name: "LD", text: "Calgary weather decides half our appointment book." },
    ],
  },
  {
    id: "color-trend",
    legacyName: "Color & Trend",
    name: "Color & Trend",
    viTitle: "Bàn Màu",
    enTitle: "The Color Table",
    count: 0,
    action: "people talking",
    topic:
      "Màu, trend, design, bling nào khách đang hỏi nhiều?",
    subtitle: "Màu, trend, design, bling nào khách đang hỏi nhiều?",
    hostNudge:
      "Chia sẻ màu/set thoải mái. Đừng đăng mặt khách hoặc thông tin riêng nha.",
    imageCaptionMaxChars: 180,
    maxPostChars: 220,
    status: "inactive",
    tableStatus: "Quiet",
    initials: [],
    tone: "cyan",
    note:
      "Client-requested colors, rising trends, best-selling designs, gel/dip/acrylic looks, bling, charms, and product ideas.",
    artwork: COLOR_TREND_STAGE_IMAGE_SRC,
    topicChips: COLOR_TREND_TOPIC_CHIPS,
    emptyState: {
      viTitle: "Chưa có chuyện mới.",
      enTitle: "No talk yet.",
    },
    rules: COLOR_TREND_RULES,
    composerPlaceholder: "Khách đang hỏi gì?",
    reactionStyle: "none",
    mode: "local-session-with-chips",
    messages: [],
  },
  {
    id: "vent-table",
    legacyName: "Vent Table",
    name: "Vent Table",
    viTitle: "Bàn Xả Hơi",
    enTitle: "Vent Table",
    count: 6,
    action: "people talking",
    topic: "Xả nhẹ một câu, đừng làm độc cả bàn.",
    subtitle: "Xả nhẹ một câu, đừng làm độc cả bàn.",
    hostNudge:
      "Xả nhẹ cho đỡ mệt. Đừng gọi tên khách, tiệm, hay thợ trực tiếp nha.",
    maxPostChars: 350,
    status: "inactive",
    tableStatus: "Lively",
    initials: ["Anh", "Bao", "Nhi", "SL", "PQ", "TV"],
    tone: "gold",
    note: "Tired days, funny clients, after-work talk, and a little tea with boundaries.",
    artwork: "/images/cho-neo/Ban-Xa-Hoi-New.png",
    topicChips: LOCAL_TABLE_CONFIG["vent-table"].topicChips,
    emptyState: LOCAL_TABLE_CONFIG["vent-table"].emptyState,
    rules: LOCAL_TABLE_CONFIG["vent-table"].rules,
    composerPlaceholder: LOCAL_TABLE_CONFIG["vent-table"].composerPlaceholder,
    reactionStyle: "generic",
    mode: "local-session",
    messages: [
      { name: "Anh", text: "Builder gel depends on your prep. No magic bottle fixes lifting." },
      { name: "Bao", text: "The popular one is good, but the viscosity runs warm." },
      { name: "Nhi", text: "Clients like strength, but they hate thick sidewalls." },
      { name: "SL", text: "I need brands that ship consistently more than hype." },
    ],
  },
  {
    id: "quiet-table",
    legacyName: "Quiet Table",
    name: "Quiet Table",
    viTitle: "Bàn Yên",
    enTitle: "Quiet Table",
    count: 2,
    action: "people listening",
    topic: "Nói nhỏ, nghĩ chậm, uống miếng trà.",
    subtitle: "Nói nhỏ, nghĩ chậm, uống miếng trà.",
    hostNudge:
      "Ngồi nhẹ thôi. Viết điều cần nói, không cần dài, không cần hoàn hảo.",
    maxPostChars: 350,
    status: "inactive",
    tableStatus: "Listening",
    initials: ["Linh", "Duc"],
    tone: "green",
    note: "Softer talk, reflection, tea-table mood, and kindness after a long shift.",
    artwork: "/images/cho-neo/Ban-Yen-New.png",
    topicChips: LOCAL_TABLE_CONFIG["quiet-table"].topicChips,
    emptyState: LOCAL_TABLE_CONFIG["quiet-table"].emptyState,
    rules: LOCAL_TABLE_CONFIG["quiet-table"].rules,
    composerPlaceholder: LOCAL_TABLE_CONFIG["quiet-table"].composerPlaceholder,
    reactionStyle: "generic",
    mode: "local-session",
    messages: [
      { name: "Linh", text: "Staffing gets heavy when everyone is tired but nobody says it." },
      { name: "Duc", text: "Clear schedule rules saved us more drama than any meeting." },
      { name: "Linh", text: "I am trying to fix the system before blaming people." },
    ],
  },
  {
    id: "private-table",
    legacyName: "Private Table",
    name: "Private Table",
    viTitle: "Bàn Riêng",
    enTitle: "Private Table",
    count: 0,
    action: "people listening",
    topic: "Nói nhỏ hơn, giữ chuyện gọn hơn.",
    subtitle: "Nói nhỏ hơn, giữ chuyện gọn hơn.",
    hostNudge: "Bàn Riêng chưa mở cho tới khi có riêng tư thật.",
    maxPostChars: 0,
    status: "inactive",
    tableStatus: "Quiet",
    initials: [],
    tone: "green",
    note: "A quieter corner for smaller conversations that still follow the café rules.",
    artwork: null,
    topicChips: [],
    emptyState: null,
    rules: [],
    composerPlaceholder:
      "Viết ngắn thôi: hỏi, góp ý, chia sẻ kinh nghiệm... / Keep it short: ask, add advice, share shop experience...",
    reactionStyle: "none",
    mode: "inactive-private",
    messages: [],
  },
];
const activeTables = tables.filter((table) => table.status === "active");

const GOSSIP_AVATAR_COPY: Record<
  string,
  { name: string; description: string }
> = {
  "nail-tech-female": {
    name: "Thợ Nail Nữ",
    description: "Tay nghề chắc. Biết chuyện dưới sàn tiệm.",
  },
  "nail-tech-male": {
    name: "Thợ Nail Nam",
    description: "Vững tay nghề. Nhìn nhanh chuyện trong tiệm.",
  },
  "salon-owner-female": {
    name: "Chủ Tiệm Nữ",
    description: "Dẫn dắt bằng tình. Quán xuyến cả tiệm.",
  },
  "salon-owner-male": {
    name: "Chủ Tiệm Nam",
    description: "Đầu óc kinh doanh. Góp ý thực tế. Tìm được đường ra.",
  },
  "gossip-cafe-regular": {
    name: "Khách Quen Quán Tám",
    description: "Ấm áp. Hay trò chuyện. Luôn quanh bàn.",
  },
  "style-lover": {
    name: "Người Có Gu",
    description: "Tự tin. Thích thắng. Khoe hành trình.",
  },
  "bling-bling-girl": {
    name: "Cô Lấp Lánh",
    description: "Lấp lánh. Đẹp. Thích nổi bật.",
  },
  "color-queen": {
    name: "Nữ Hoàng Màu",
    description: "Mê màu. Biết phối. Để ý từng chi tiết.",
  },
};

function isChoNeoDaytime(date = new Date()) {
  const hour = date.getHours();

  return hour >= 6 && hour < 18;
}

function getQuanTamArtworkSources(date = new Date()) {
  const isDaytime = isChoNeoDaytime(date);

  return {
    shopTalk: isDaytime
      ? BAN_CHUYEN_NGHE_DAY_ARTWORK_SRC
      : BAN_CHUYEN_NGHE_NIGHT_ARTWORK_SRC,
    frontCounter: isDaytime
      ? QUAY_XA_GIAO_DAY_ARTWORK_SRC
      : QUAY_XA_GIAO_NIGHT_ARTWORK_SRC,
    lobby: isDaytime ? QUAN_TAM_DAY_ARTWORK_SRC : QUAN_TAM_NIGHT_ARTWORK_SRC,
  };
}

function getNextQuanTamArtworkBoundaryMs(date = new Date()) {
  const nextBoundary = new Date(date);
  const hour = date.getHours();

  nextBoundary.setMinutes(0, 0, 0);

  if (hour < 6) {
    nextBoundary.setHours(6);
  } else if (hour < 18) {
    nextBoundary.setHours(18);
  } else {
    nextBoundary.setDate(nextBoundary.getDate() + 1);
    nextBoundary.setHours(6);
  }

  return Math.max(1000, nextBoundary.getTime() - date.getTime());
}

function formatFrontCounterMessageTime(createdAt?: string) {
  if (!createdAt) {
    return "";
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes()
  ).padStart(2, "0")}`;
}

function useQuanTamArtworkSources() {
  const [artworkSources, setArtworkSources] = useState({
    shopTalk: BAN_CHUYEN_NGHE_NIGHT_ARTWORK_SRC,
    frontCounter: QUAY_XA_GIAO_NIGHT_ARTWORK_SRC,
    lobby: QUAN_TAM_NIGHT_ARTWORK_SRC,
  });

  useEffect(() => {
    let timeoutId: number | null = null;

    const syncArtwork = () => {
      const now = new Date();
      setArtworkSources(getQuanTamArtworkSources(now));
      timeoutId = window.setTimeout(syncArtwork, getNextQuanTamArtworkBoundaryMs(now));
    };

    syncArtwork();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return artworkSources;
}

export default function ChoNeoGossipPage() {
  const supabase = useMemo(() => createClient(), []);
  const { ensureChoNeoMember, profile } = useChoNeoMember();
  const cafeControlPillClassName = "cafe-control-pill";
  const quanTamArtworkSources = useQuanTamArtworkSources();
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [frontCounterMessages, setFrontCounterMessages] = useState<
    FrontCounterMessage[]
  >(seededFrontCounterMessages);
  const [seatedIdentity, setSeatedIdentity] = useState<FrontCounterSeat | null>(
    null
  );
  const [frontCounterDraft, setFrontCounterDraft] = useState("");
  const [frontCounterMemoryMode, setFrontCounterMemoryMode] =
    useState<FrontCounterMemoryMode>("local");
  const [frontCounterMemoryNotice, setFrontCounterMemoryNotice] = useState<
    string | null
  >(null);
  const [frontCounterPosting, setFrontCounterPosting] = useState(false);
  const [frontCounterPostNotice, setFrontCounterPostNotice] = useState<
    string | null
  >(null);
  const [identity, setIdentity] = useState<ChoNeoIdentity | null>(null);
  const [avatarProfile, setAvatarProfile] =
    useState<ChoNeoAvatarProfile | null>(null);
  const [reportedMessageIds, setReportedMessageIds] = useState<string[]>([]);
  const [moderationNotice, setModerationNotice] = useState<string | null>(null);
  const [moderationBusyMessageId, setModerationBusyMessageId] = useState<
    string | null
  >(null);
  const [frontCounterDrawerOpen, setFrontCounterDrawerOpen] = useState(false);
  const [hostToolsOpen, setHostToolsOpen] = useState(false);
  const [hostKey, setHostKey] = useState("");
  const [hostReviewMessages, setHostReviewMessages] = useState<
    FrontCounterMessage[]
  >([]);
  const [hostReviewLoading, setHostReviewLoading] = useState(false);
  const [hostReviewNotice, setHostReviewNotice] = useState<string | null>(null);
  const [hostReviewUnlocked, setHostReviewUnlocked] = useState(false);
  const [sharedFetchedMessageIds, setSharedFetchedMessageIds] = useState<string[]>(
    []
  );
  const [rulesAcknowledgementOpen, setRulesAcknowledgementOpen] = useState(false);
  const [tableNotesByName, setTableNotesByName] = useState<TableNotesByName>({});
  const [tableNoteDraft, setTableNoteDraft] = useState("");
  const [tableNoteNotice, setTableNoteNotice] = useState<string | null>(null);
  const [tableHostNudgeVisible, setTableHostNudgeVisible] = useState(false);
  const frontCounterDraftRef = useRef("");
  const frontCounterInputRef = useRef<HTMLInputElement | null>(null);
  const frontCounterPostingRef = useRef(false);
  const tableNoteInputRef = useRef<HTMLInputElement | null>(null);
  const selectedTable = useMemo(
    () => activeTables.find((table) => table.legacyName === selectedTableName) ?? null,
    [selectedTableName]
  );
  const isFrontCounter = selectedTable?.id === "front-counter";
  const isTrendTable = selectedTable?.id === "color-trend";
  const isLocalSessionTable = selectedTable?.mode === "local-session";
  const isShopTalkTable = selectedTable?.id === "shop-talk";
  const localTableConfig = isLocalSessionTable
    ? LOCAL_TABLE_CONFIG[selectedTable.id as keyof typeof LOCAL_TABLE_CONFIG]
    : null;
  const selectedMessages: Array<ConversationMessage | FrontCounterMessage> =
    isFrontCounter
      ? frontCounterMessages.filter(isVisibleFrontCounterMessage)
      : isTrendTable
        ? selectedTable
          ? tableNotesByName[selectedTable.name] ?? []
          : []
      : [
          ...(selectedTable?.messages ?? []),
          ...(selectedTable ? tableNotesByName[selectedTable.name] ?? [] : []),
        ];
  const frontCounterMeaningfulCharacters =
    getMeaningfulCharacterCount(frontCounterDraft);
  const canSubmitFrontCounterMessage =
    frontCounterDraft.trim().length > 0 && !frontCounterPosting;
  const selectedTablePostLimit =
    selectedTable?.maxPostChars ?? TABLE_NOTE_MESSAGE_LIMIT;
  const remainingTableNoteCharacters =
    selectedTablePostLimit - tableNoteDraft.length;
  const tableNoteCharacterCountWarningThreshold = Math.min(
    40,
    Math.ceil(selectedTablePostLimit * 0.15)
  );
  const shouldShowTableNoteCharacterCount =
    tableNoteDraft.length > 0 &&
    remainingTableNoteCharacters <= tableNoteCharacterCountWarningThreshold;
  const tableNoteMeaningfulCharacters = getMeaningfulCharacterCount(tableNoteDraft);
  const canSubmitTableNote =
    !!selectedTable &&
    !isFrontCounter &&
    tableNoteDraft.trim().length > 0 &&
    tableNoteMeaningfulCharacters >= TABLE_NOTE_MIN_MEANINGFUL_CHARACTERS;
  const currentAvatar = identity ? getAvatarById(identity.avatarId) : null;
  const visibleSeats = dedupeSeats([
    ...seededFrontCounterMessages.slice(0, 4).map((message) => ({
      avatarId: message.avatarId,
      nickname: message.nickname,
    })),
    ...(seatedIdentity ? [seatedIdentity] : []),
  ]);
  const isCurrentIdentitySeated =
    !!identity &&
    !!seatedIdentity &&
    seatedIdentity.avatarId === identity.avatarId &&
    seatedIdentity.nickname === identity.nickname;

  useEffect(() => {
    let cancelled = false;
    const readStoredAvatarProfile = () => {
      try {
        const rawProfile = window.localStorage.getItem(CHO_NEO_AVATAR_PROFILE_KEY);

        if (!rawProfile) {
          return null;
        }

        const parsedProfile = JSON.parse(rawProfile) as Partial<ChoNeoAvatarProfile>;

        if (
          typeof parsedProfile.avatarId !== "string" ||
          typeof parsedProfile.nickname !== "string" ||
          typeof parsedProfile.mood !== "string" ||
          typeof parsedProfile.updatedAt !== "string"
        ) {
          return null;
        }

        const avatar = getAvatarById(parsedProfile.avatarId);
        return {
          avatarId: avatar.id,
          avatarSrc: avatar.src,
          nickname: parsedProfile.nickname.trim(),
          mood: parsedProfile.mood.trim(),
          updatedAt: parsedProfile.updatedAt,
        };
      } catch {
        return null;
      }
    };

    const storedProfile = readStoredAvatarProfile();
    if (isVerifiedChoNeoMemberProfile(profile)) {
      const memberAvatar = profile.avatar;
      const memberIdentity: ChoNeoIdentity = {
        avatarId: memberAvatar.id,
        createdAt: storedProfile?.updatedAt ?? new Date().toISOString(),
        nickname: profile.displayName,
        updatedAt: new Date().toISOString(),
      };
      setIdentity(memberIdentity);
      setAvatarProfile({
        avatarId: memberAvatar.id,
        avatarSrc: memberAvatar.src,
        mood: storedProfile?.mood ?? QUIET_GOSSIP_MOOD,
        nickname: profile.displayName,
        updatedAt: memberIdentity.updatedAt,
      });
    } else {
      setAvatarProfile(storedProfile);
      const savedIdentity = getChoNeoIdentity();

      if (savedIdentity) {
        setIdentity(savedIdentity);
      } else {
        createQuietGossipIdentity();
      }
    }

    const searchParams = new URLSearchParams(window.location.search);

    setHostToolsOpen(searchParams.get("hostTools") === "1");
    try {
      setRulesAcknowledgementOpen(
        window.localStorage.getItem(GOSSIP_RULES_ACCEPTED_KEY) !== "true"
      );
    } catch {
      setRulesAcknowledgementOpen(true);
    }
    setReportedMessageIds(readReportedFrontCounterMessageIds());

    const savedFrontCounter = readFrontCounterState();
    setFrontCounterMessages(
      savedFrontCounter.messages.length
        ? savedFrontCounter.messages
        : seededFrontCounterMessages
    );
    setSeatedIdentity(savedFrontCounter.seatedIdentity ?? null);

    async function loadSharedFrontCounterMessages() {
      try {
        const sharedMessages = await fetchSharedFrontCounterMessages();

        if (cancelled) {
          return;
        }

        setFrontCounterMessages(sharedMessages);
        setSharedFetchedMessageIds(getSharedFrontCounterMessageIds(sharedMessages));
        setFrontCounterMemoryMode("shared");
        setFrontCounterMemoryNotice(null);
      } catch {
        if (cancelled) {
          return;
        }

        setFrontCounterMemoryMode("local");
        setSharedFetchedMessageIds([]);
        setFrontCounterMemoryNotice(
          "Shared village memory is not configured yet, so this table is using this device."
        );
      }
    }

    void loadSharedFrontCounterMessages();

    function handleAvatarStorage(event: StorageEvent) {
      if (event.key === CHO_NEO_AVATAR_PROFILE_KEY && !isVerifiedChoNeoMemberProfile(profile)) {
        setAvatarProfile(readStoredAvatarProfile());
      }
    }

    window.addEventListener("storage", handleAvatarStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleAvatarStorage);
    };
  }, [profile]);

  useEffect(() => {
    if (!selectedTable?.hostNudge) {
      setTableHostNudgeVisible(false);
      return;
    }

    setTableHostNudgeVisible(true);
    const nudgeTimer = window.setTimeout(() => {
      setTableHostNudgeVisible(false);
    }, 4000);

    return () => window.clearTimeout(nudgeTimer);
  }, [selectedTable?.hostNudge, selectedTable?.id]);

  async function handleFrontCounterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await submitFrontCounterDraft();
  }

  function replyToFrontCounterMessage(displayName: string) {
    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      return;
    }

    ensureFrontCounterComposerReady();
    const mention = `@${trimmedDisplayName} `;
    const currentDraft = frontCounterDraftRef.current;
    const nextDraft = currentDraft.startsWith(mention)
      ? currentDraft
      : `${mention}${currentDraft}`.slice(0, FRONT_COUNTER_MESSAGE_LIMIT);

    frontCounterDraftRef.current = nextDraft;
    setFrontCounterDraft(nextDraft);
    setFrontCounterPostNotice(null);
    window.setTimeout(() => frontCounterInputRef.current?.focus(), 0);
  }

  async function submitFrontCounterDraft() {
    const text = frontCounterDraftRef.current.trim();

    if (frontCounterPosting || frontCounterPostingRef.current) {
      return;
    }

    if (!text) {
      setFrontCounterPostNotice("Viết một ghi chú nhỏ trước khi đăng. / Write a little note before posting.");
      return;
    }

    if (getMeaningfulCharacterCount(text) < FRONT_COUNTER_MIN_MEANINGFUL_CHARACTERS) {
      setFrontCounterPostNotice(
        "Viết thêm chút nữa để cả làng hiểu được. / Give it a little more than a nod so the village can understand."
      );
      return;
    }

    const activeIdentity = ensureFrontCounterComposerReady();
    await ensureChoNeoMember(async () => {
      await persistFrontCounterDraft(activeIdentity, text);
    });
  }

  async function persistFrontCounterDraft(
    activeIdentity: ChoNeoIdentity,
    text: string,
  ) {
    frontCounterPostingRef.current = true;
    setFrontCounterPosting(true);
    setFrontCounterPostNotice(null);

    if (frontCounterMemoryMode === "shared") {
      const authorSnapshot = getCurrentAuthorSnapshot();

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          throw new Error("Missing Cho Neo pass session");
        }

        const savedMessage = await postSharedFrontCounterMessage({
          avatarId: activeIdentity.avatarId,
          nickname: activeIdentity.nickname,
          text,
          token,
        });

        if (process.env.NODE_ENV === "development") {
          console.info("[cho-neo:gossip-front-counter] POST returned message id", {
            messageId: savedMessage.id,
          });
        }

        const sharedMessages = await fetchSharedFrontCounterMessages();
        const decoratedSharedMessages = sharedMessages.map((message) =>
          message.id === savedMessage.id && authorSnapshot
            ? { ...message, author: authorSnapshot }
            : message
        );

        setFrontCounterMessages(decoratedSharedMessages);
        setSharedFetchedMessageIds(getSharedFrontCounterMessageIds(decoratedSharedMessages));
        frontCounterDraftRef.current = "";
        setFrontCounterDraft("");
        setFrontCounterMemoryNotice(null);
        setFrontCounterPostNotice(
          "Đã đăng ở Quầy Xã Giao. Cảm ơn bạn giữ câu chuyện có ích. / Posted at the Social Counter. Thanks for keeping it useful."
        );
        releaseFrontCounterPostingGuard();
        setFrontCounterPosting(false);
        return;
      } catch (error) {
        const sharedPostReason =
          error instanceof Error ? error.message.toLowerCase() : "";

        if (
          sharedPostReason.includes("missing-cho-neo-member") ||
          sharedPostReason.includes("unverified-cho-neo-member")
        ) {
          setFrontCounterPostNotice(
            "Vào Chợ Neo và xác nhận thành viên ngành nail trước khi góp chuyện nha."
          );
          releaseFrontCounterPostingGuard();
          setFrontCounterPosting(false);
          return;
        }

        setFrontCounterMemoryMode("local");
        setSharedFetchedMessageIds([]);
        setFrontCounterMemoryNotice(
          "Shared village memory is unavailable right now, so this post is saved on this device."
        );
      }
    }

    try {
      saveFrontCounterMessageLocally({
        author: getCurrentAuthorSnapshot(),
        identity: activeIdentity,
        text,
      });
    } catch {
      setFrontCounterPostNotice(
        "Chưa đăng được câu này. Bạn thử lại sau nha. / This post could not be saved. Please try again."
      );
    } finally {
      releaseFrontCounterPostingGuard();
      setFrontCounterPosting(false);
    }
  }

  function releaseFrontCounterPostingGuard() {
    window.setTimeout(() => {
      frontCounterPostingRef.current = false;
    }, 0);
  }

  function saveFrontCounterMessageLocally(input: {
    author?: FrontCounterMessage["author"];
    identity: ChoNeoIdentity;
    text: string;
  }) {
    const localState = readFrontCounterState();
    const nextMessage = createFrontCounterMessage(input);
    const nextMessages = [
      ...(localState.messages.length ? localState.messages : frontCounterMessages),
      nextMessage,
    ].slice(-FRONT_COUNTER_MESSAGE_CAP);
    const nextSeat = seatedIdentity ?? localState.seatedIdentity;

    setFrontCounterMessages(nextMessages);
    saveFrontCounterState({
      messages: nextMessages,
      seatedIdentity: nextSeat,
    });
    frontCounterDraftRef.current = "";
    setFrontCounterDraft("");
    setFrontCounterPostNotice(
      "Đã đăng ở Quầy Xã Giao. Cảm ơn bạn giữ câu chuyện có ích. / Posted at the Social Counter. Thanks for keeping it useful."
    );
  }

  function handleTableNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTable || isFrontCounter) {
      return;
    }

    const text = tableNoteDraft.trim();

    if (!text) {
      setTableNoteNotice(
        "Viết một ghi chú nhỏ trước khi góp chuyện. / Write a small note before joining in."
      );
      return;
    }

    if (getMeaningfulCharacterCount(text) < TABLE_NOTE_MIN_MEANINGFUL_CHARACTERS) {
      setTableNoteNotice(
        "Viết thêm chút nữa để bàn hiểu ý bạn. / Add a little more so the table can understand."
      );
      return;
    }

    if (isTrendTable) {
      const bigTableNotice = getTrendTableNoteBlockNotice(text);

      if (bigTableNotice) {
        setTableNoteNotice(bigTableNotice);
        return;
      }
    }

    const nextMessage: ConversationMessage = {
      author: getCurrentAuthorSnapshot(),
      name: identity?.nickname ?? "Bạn làng",
      text,
    };

    setTableNotesByName((currentNotes) => ({
      ...currentNotes,
      [selectedTable.name]: [
        ...(currentNotes[selectedTable.name] ?? []),
        nextMessage,
      ],
    }));
    setTableNoteDraft("");
    setTableNoteNotice(
      isTrendTable
        ? "Đã đặt lên Bàn Màu. Cảm ơn bạn chia sẻ trend có ích. / Put on the Trend Table. Thanks for sharing a useful trend note."
        : "Đã góp chuyện vào bàn. Cảm ơn bạn giữ câu chuyện có ích. / Added to the table. Thanks for keeping it useful."
    );
  }

  function useTrendTablePrompt(prompt: { en: string; insert?: string; vi: string }) {
    setTableNoteDraft((currentDraft) => {
      const starterText = prompt.insert ?? prompt.vi;
      const nextPrompt = `${starterText} `;

      if (!currentDraft.trim()) {
        return nextPrompt.slice(0, selectedTablePostLimit);
      }

      return `${currentDraft.trim()} ${nextPrompt}`.slice(0, selectedTablePostLimit);
    });
    setTableNoteNotice(null);
    window.requestAnimationFrame(() => {
      tableNoteInputRef.current?.focus();
    });
  }

  function useLocalTablePrompt(prompt: { insert: string }) {
    setTableNoteDraft((currentDraft) => {
      const nextPrompt = `${prompt.insert} `;

      if (!currentDraft.trim()) {
        return nextPrompt.slice(0, selectedTablePostLimit);
      }

      return `${currentDraft.trim()} ${nextPrompt}`.slice(0, selectedTablePostLimit);
    });
    setTableNoteNotice(null);
    window.requestAnimationFrame(() => {
      tableNoteInputRef.current?.focus();
    });
  }

  async function reportFrontCounterMessage(message: FrontCounterMessage) {
    if (!identity) {
      createQuietGossipIdentity();
    }

    if (reportedMessageIds.includes(message.id) || moderationBusyMessageId) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[cho-neo:gossip-front-counter] Report clicked message id", {
        messageId: message.id,
      });
    }

    if (
      frontCounterMemoryMode === "shared" &&
      !sharedFetchedMessageIds.includes(message.id)
    ) {
      await refreshSharedFrontCounterMessages(
        "Refreshing shared messages before reporting."
      );
      return;
    }

    await ensureChoNeoMember(async () => {
      await persistFrontCounterReport(message);
    });
  }

  async function persistFrontCounterReport(message: FrontCounterMessage) {
    setModerationBusyMessageId(message.id);
    setModerationNotice(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (frontCounterMemoryMode === "shared" && !token) {
        throw new Error("Missing Cho Neo pass session");
      }

      const updatedMessage =
        frontCounterMemoryMode === "shared"
          ? await reportSharedFrontCounterMessage({
              messageId: message.id,
              token: token ?? "",
            })
          : {
              ...message,
              reportCount: (message.reportCount ?? 0) + 1,
              reportedAt: new Date().toISOString(),
            };

      updateFrontCounterMessage(updatedMessage);
      rememberReportedFrontCounterMessageId(message.id);
      setReportedMessageIds((currentIds) => [...currentIds, message.id]);
      setModerationNotice("Thanks. The village host can review this report.");
    } catch {
      setModerationNotice("Could not report that message right now.");
    } finally {
      setModerationBusyMessageId(null);
    }
  }

  async function moderateFrontCounterMessage(
    action: FrontCounterModerationAction,
    message: FrontCounterMessage
  ) {
    if (!hostToolsOpen || moderationBusyMessageId) {
      return;
    }

    if (
      action === "remove" &&
      !window.confirm(
        "Remove this message from the café? This will show a village host removed-message placeholder."
      )
    ) {
      return;
    }

    if (frontCounterMemoryMode === "shared" && !hostKey.trim()) {
      setModerationNotice("Enter the host key before using host tools.");
      return;
    }

    if (
      frontCounterMemoryMode === "shared" &&
      !sharedFetchedMessageIds.includes(message.id)
    ) {
      const hostReviewMessageIds = getSharedFrontCounterMessageIds(hostReviewMessages);

      if (!hostReviewMessageIds.includes(message.id)) {
        await refreshSharedFrontCounterMessages(
          "Refreshing shared messages before using host tools."
        );
        return;
      }
    }

    setModerationBusyMessageId(message.id);
    setModerationNotice(null);

    try {
      if (frontCounterMemoryMode === "shared") {
        const updatedMessage = await updateSharedFrontCounterMessageAsHost({
          action,
          hostKey: hostKey.trim(),
          messageId: message.id,
        });

        if (action === "hide") {
          removeFrontCounterMessage(message.id);
        } else {
          updateFrontCounterMessage(updatedMessage);
        }
      } else if (action === "hide") {
        removeFrontCounterMessage(message.id);
      } else if (action === "markReviewed") {
        updateFrontCounterMessage({
          ...message,
          reportCount: 0,
          reportedAt: null,
        });
      } else if (action === "unhide") {
        updateFrontCounterMessage({
          ...message,
          hiddenAt: null,
        });
      } else {
        updateFrontCounterMessage({
          ...message,
          removedAt: new Date().toISOString(),
          text: "This message was removed by the village host.",
        });
      }

      setModerationNotice(
        getHostModerationNotice(action)
      );
      if (frontCounterMemoryMode === "shared") {
        await syncSharedFrontCounterMessages();
      }
      if (hostReviewUnlocked) {
        await loadHostReviewMessages();
      }
    } catch {
      setModerationNotice("Host action failed. Check the host key and Supabase setup.");
    } finally {
      setModerationBusyMessageId(null);
    }
  }

  function updateFrontCounterMessage(updatedMessage: FrontCounterMessage) {
    setFrontCounterMessages((currentMessages) => {
      const nextMessages = currentMessages.map((message) =>
        message.id === updatedMessage.id ? updatedMessage : message
      );

      if (frontCounterMemoryMode === "local") {
        saveFrontCounterState({
          messages: nextMessages,
          seatedIdentity,
        });
      }

      return nextMessages;
    });
  }

  function removeFrontCounterMessage(messageId: string) {
    setFrontCounterMessages((currentMessages) => {
      const nextMessages = currentMessages.filter(
        (message) => message.id !== messageId
      );

      if (frontCounterMemoryMode === "local") {
        saveFrontCounterState({
          messages: nextMessages,
          seatedIdentity,
        });
      }

      return nextMessages;
    });
  }

  async function refreshSharedFrontCounterMessages(notice: string) {
    setModerationNotice(notice);

    try {
      const sharedMessages = await fetchSharedFrontCounterMessages();
      setFrontCounterMessages(sharedMessages);
      setSharedFetchedMessageIds(getSharedFrontCounterMessageIds(sharedMessages));
      setFrontCounterMemoryMode("shared");
      setFrontCounterMemoryNotice(null);
    } catch {
      setModerationNotice("Could not refresh shared messages right now.");
    }
  }

  async function syncSharedFrontCounterMessages() {
    try {
      const sharedMessages = await fetchSharedFrontCounterMessages();
      setFrontCounterMessages(sharedMessages);
      setSharedFetchedMessageIds(getSharedFrontCounterMessageIds(sharedMessages));
      setFrontCounterMemoryMode("shared");
      setFrontCounterMemoryNotice(null);
    } catch {
      setModerationNotice("Could not refresh shared messages right now.");
    }
  }

  async function loadHostReviewMessages() {
    if (!hostKey.trim()) {
      setHostReviewNotice("Enter the host key.");
      return;
    }

    setHostReviewLoading(true);
    setHostReviewNotice(null);

    try {
      const messages = await fetchHostReviewFrontCounterMessages(hostKey.trim());
      setHostReviewMessages(messages);
      setHostReviewUnlocked(true);
    } catch {
      setHostReviewMessages([]);
      setHostReviewUnlocked(false);
      setHostReviewNotice("Host Review is locked. Check the host key.");
    } finally {
      setHostReviewLoading(false);
    }
  }

  function closeHostReview() {
    setHostKey("");
    setHostReviewMessages([]);
    setHostReviewNotice(null);
    setHostReviewUnlocked(false);
  }

  function createQuietGossipIdentity() {
    const now = new Date().toISOString();
    let nextIdentity: ChoNeoIdentity = {
      avatarId: CHO_NEO_AVATARS[0].id,
      createdAt: now,
      nickname: QUIET_GOSSIP_NICKNAME,
      updatedAt: now,
    };

    try {
      const savedIdentity = saveChoNeoIdentity({
        avatarId: CHO_NEO_AVATARS[0].id,
        existingIdentity: null,
        nickname: QUIET_GOSSIP_NICKNAME,
      });

      if (savedIdentity) {
        nextIdentity = savedIdentity;
      }
    } catch {
      // Storage-restricted sessions can still use the quiet in-memory identity.
    }

    setIdentity(nextIdentity);
    setAvatarProfile({
      avatarId: nextIdentity.avatarId,
      avatarSrc: getAvatarById(nextIdentity.avatarId).src,
      mood: QUIET_GOSSIP_MOOD,
      nickname: nextIdentity.nickname,
      updatedAt: nextIdentity.updatedAt,
    });

    return nextIdentity;
  }

  function takeFrontCounterSeat() {
    ensureFrontCounterComposerReady();
  }

  function ensureFrontCounterComposerReady() {
    const activeIdentity = identity ?? createQuietGossipIdentity();

    if (
      !seatedIdentity ||
      seatedIdentity.avatarId !== activeIdentity.avatarId ||
      seatedIdentity.nickname !== activeIdentity.nickname
    ) {
      const nextSeat = createFrontCounterSeat(activeIdentity);
      setSeatedIdentity(nextSeat);
      saveFrontCounterSeat(nextSeat);
    }

    return activeIdentity;
  }

  function enterFrontCounterTable() {
    const activeIdentity = identity ?? createQuietGossipIdentity();

    if (
      !seatedIdentity ||
      seatedIdentity.avatarId !== activeIdentity.avatarId ||
      seatedIdentity.nickname !== activeIdentity.nickname
    ) {
      const nextSeat = createFrontCounterSeat(activeIdentity);
      setSeatedIdentity(nextSeat);
      saveFrontCounterSeat(nextSeat);
    }

    window.setTimeout(() => {
      frontCounterInputRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      frontCounterInputRef.current?.focus();
    }, 80);
  }

  function enterSelectedTable() {
    window.setTimeout(() => {
      tableNoteInputRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      tableNoteInputRef.current?.focus();
    }, 80);
  }

  function acceptGossipRules() {
    try {
      window.localStorage.setItem(GOSSIP_RULES_ACCEPTED_KEY, "true");
    } catch {
      // Storage-restricted sessions can continue for the current visit.
    }

    setRulesAcknowledgementOpen(false);
  }

  function openTable(tableName: string) {
    setSelectedTableName(tableName);
    setTableNoteDraft("");
    setTableNoteNotice(null);

    if (tables.find((table) => table.legacyName === tableName)?.id === "color-trend") {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  }

  function getCompactTableCountLabel(table: (typeof tables)[number]) {
    if (table.action === "people listening") {
      return `${table.count} đang lắng nghe`;
    }

    return `${table.count} đang bàn chuyện`;
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

  function getCurrentAuthorSnapshot() {
    if (!avatarProfile) {
      return undefined;
    }

    return {
      avatarSrc: avatarProfile.avatarSrc,
      mood: avatarProfile.mood,
      nickname: avatarProfile.nickname || identity?.nickname || "Bạn làng",
    };
  }

  function renderPostAuthor(input: {
    author?: ConversationMessage["author"] | FrontCounterMessage["author"];
    className?: string;
    fallbackAvatarId?: string;
    fallbackName: string;
  }) {
    const author = input.author;
    const displayName = author?.nickname || input.fallbackName;
    const fallbackAvatar = input.fallbackAvatarId
      ? getAvatarById(input.fallbackAvatarId)
      : null;
    const initials = getNicknameInitials(displayName);

    return (
      <div className={`post-author-chip ${input.className ?? ""}`}>
        {author?.avatarSrc ? (
          <img alt="" src={author.avatarSrc} />
        ) : fallbackAvatar ? (
          <img alt="" src={fallbackAvatar.src} />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
        <strong>
          {displayName}
          {author?.mood ? <small>{author.mood}</small> : null}
        </strong>
      </div>
    );
  }

  function renderAvatarPassportChip() {
    if (!avatarProfile) {
      return (
        <Link
          className="composer-avatar-passport composer-avatar-passport-empty"
          href="/cho-neo/avatar"
        >
          <span className="composer-avatar-placeholder" aria-hidden="true">
            +
          </span>
          <strong>
            Chọn dáng vào chợ
          </strong>
        </Link>
      );
    }

    return (
      <Link
        className="composer-avatar-passport"
        href="/cho-neo/avatar"
        aria-label="Đổi dáng vào chợ"
      >
        <span className="composer-avatar-identity">
          {currentAvatar ? (
            <img alt="" src={currentAvatar.src} />
          ) : (
            <img alt="" src={avatarProfile.avatarSrc} />
          )}
          <strong>
            {avatarProfile.nickname || "Người Ghé Chợ"}
            <small>{avatarProfile.mood || "Nhẹ nhàng"}</small>
          </strong>
        </span>
        <span className="composer-avatar-action">Đổi dáng</span>
      </Link>
    );
  }

  return (
    <main className="cafe-page">
      <ChoNeoTimeAmbience />
      <div className="room-glow" />
      <div className="floor-grid" />

      <section className="cafe-shell" aria-labelledby="gossip-title">
        <header className="cafe-hero">
          <div>
            <h1 id="gossip-title">
              Quán Tám
              <span>Gossip Café</span>
            </h1>
            <p className="subtitle">
              Vào quán, chọn một bàn, nói vừa đủ nghe.
              <span>
                Step in, choose a table, keep the room warm.
              </span>
            </p>
          </div>
        </header>

        {!(isFrontCounter || isShopTalkTable) ? (
        <div className="cafe-stage-controls">
          <nav className="cafe-control-row" aria-label="Quán Tám controls">
            <Link className={cafeControlPillClassName} href="/cho-neo">
              <span>← Về Sân Làng</span>
            </Link>
            <Link className={cafeControlPillClassName} href="/cho-neo/avatar">
              <span>Chọn avatar</span>
            </Link>
          </nav>
          <div className="cafe-hero-actions" aria-label="Quán Tám quick actions">
            <span
              className="cho-neo-shared-music-slot cafe-theme-audio"
              data-cho-neo-shared-music-slot
            />
            <ChoNeoBetaFeedback />
          </div>
        </div>
        ) : null}

        <>
        <section
          className={`room-scene room-scene-entered room-scene-settled ${
            selectedTable ? "room-scene-focused" : ""
          }`}
          aria-label="Gossip Café table clusters"
        >
          <div className="counter" aria-hidden="true">
            <span className="counter-light" />
            <strong>
              GỌI MÓN Ở ĐÂY, NÓI NHỎ, NHỚ GIỮ RECEIPT.
              <span>ORDER HERE, TALK SOFTLY, BRING RECEIPTS.</span>
            </strong>
          </div>

          {selectedTable ? (
            <article className={`table-detail table-${selectedTable.tone}`}>
              <span className="table-glow" />
              <div className="detail-table-plate" aria-hidden="true">
                {selectedTable.initials.map((initial, seatIndex) => (
                  <span key={`${initial}-${seatIndex}`} />
                ))}
              </div>

              <div
                className={`detail-panel ${
                  isFrontCounter || isShopTalkTable ? "detail-panel-front-counter" : ""
                } ${
                  isShopTalkTable ? "detail-panel-shop-talk" : ""
                } ${
                  isTrendTable ? "detail-panel-trend-table" : ""
                } ${
                  isLocalSessionTable && !isShopTalkTable ? "detail-panel-local-table" : ""
                } ${
                  isFrontCounter && frontCounterDrawerOpen
                    ? "front-counter-drawer-open"
                    : ""
                }`}
              >
                {isTrendTable ? (
                  <CompactTableHeader
                    countLabel={getCompactTableCountLabel(selectedTable)}
                    onEnter={enterSelectedTable}
                    onBack={() => setSelectedTableName(null)}
                  />
                ) : null}

                {isFrontCounter || isShopTalkTable ? (
                  <div className="front-counter-quick-controls">
                    <div className="front-counter-control-group">
                      <button
                        className="compact-table-back front-counter-back-control"
                        onClick={() => setSelectedTableName(null)}
                        type="button"
                      >
                        ← Quán Tám
                      </button>
                      <button
                        className={`front-counter-seat-control ${
                          isFrontCounter && isCurrentIdentitySeated
                            ? "front-counter-seat-control-seated"
                            : ""
                        }`}
                        type="button"
                        onClick={isFrontCounter ? enterFrontCounterTable : enterSelectedTable}
                        aria-label={
                          isFrontCounter && isCurrentIdentitySeated
                            ? "Đang ngồi tại Quầy Xã Giao / Seated at the Social Counter"
                            : `Vào ${getTableNameCopy(selectedTable.name).vi} / Take a seat`
                        }
                      >
                        {isFrontCounter && isCurrentIdentitySeated ? "Đang ngồi" : "Vào bàn"}
                        <span>
                          {isFrontCounter && isCurrentIdentitySeated ? "Seated" : "Take a seat"}
                        </span>
                      </button>
                    </div>
                    <div className="front-counter-control-group front-counter-action-group">
                      <span
                        className="cho-neo-shared-music-slot front-counter-theme-audio"
                        data-cho-neo-shared-music-slot
                      />
                      <ChoNeoBetaFeedback />
                      <span className="compact-table-count front-counter-count-control">
                        {getCompactTableCountLabel(selectedTable)}
                      </span>
                    </div>
                  </div>
                ) : null}

                <TableHostNudge
                  message={selectedTable.hostNudge}
                  onClose={() => setTableHostNudgeVisible(false)}
                  visible={tableHostNudgeVisible}
                />

                {!isLocalSessionTable ? (
                <div className="detail-heading">
                  <div>
                    <p>
                      {getTableStatusHeading(selectedTable.tableStatus)}
                      <span>{getTableStatusCopy(selectedTable.tableStatus).en} Table</span>
                    </p>
                    <h2>
                      {getTableNameCopy(selectedTable.name).vi}
                      <span>{getTableNameCopy(selectedTable.name).en}</span>
                    </h2>
                  </div>
                  {!isTrendTable ? (
                    <strong>
                    {isFrontCounter ? (
                      <>
                        {selectedTable.count} người đang bàn chuyện
                        <span>{selectedTable.count} people talking</span>
                      </>
                    ) : (
                      <>
                        {selectedTable.count} {getTableActionCopy(selectedTable.action).vi}
                        <span>
                          {selectedTable.count} {getTableActionCopy(selectedTable.action).en}
                        </span>
                      </>
                    )}
                    </strong>
                  ) : null}
                </div>
                ) : null}

                {isTrendTable ? (
                  <p className="trend-table-subtitle">
                    Colors, trends, designs, and bling clients are asking for.
                  </p>
                ) : !isLocalSessionTable ? (
                  <p className="topic">
                    Chủ đề: “{selectedTable.topic}”
                    <span>Topic</span>
                  </p>
                ) : null}

                {!isLocalSessionTable ? (
                <div className="member-row detail-members" aria-label={`${selectedTable.name} seated members`}>
                  {selectedTable.initials.map((initial) => (
                    <span key={initial}>{initial}</span>
                  ))}
                </div>
                ) : null}

                {!isFrontCounter && !isTrendTable && !isLocalSessionTable && selectedTable.artwork ? (
                  <div
                    className="generic-table-artwork"
                    aria-label={`${getTableNameCopy(selectedTable.name).vi} table artwork`}
                  >
                    <img
                      alt={`${getTableNameCopy(selectedTable.name).vi} / ${getTableNameCopy(selectedTable.name).en}`}
                      src={selectedTable.artwork}
                    />
                  </div>
                ) : null}

                {isLocalSessionTable && localTableConfig && !isShopTalkTable ? (
                  <QuanTamTableShell
                    ariaLabel={`${getTableNameCopy(selectedTable.name).vi} selected table`}
                    artwork={selectedTable.artwork}
                    artworkAlt={`${getTableNameCopy(selectedTable.name).vi} / ${getTableNameCopy(selectedTable.name).en}`}
                    className={`local-table-stage-${selectedTable.id}`}
                    countLabel={getCompactTableCountLabel(selectedTable)}
                    note={selectedTable.note}
                    onBack={() => setSelectedTableName(null)}
                    onEnter={enterSelectedTable}
                    subtitle={selectedTable.subtitle}
                    titleEn={getTableNameCopy(selectedTable.name).en}
                    titleVi={getTableNameCopy(selectedTable.name).vi}
                  >
                    <section className="local-table-prompts" aria-label={`${getTableNameCopy(selectedTable.name).vi} starter prompts`}>
                      <div>
                        <strong>
                          Gợi ý mở chuyện
                          <span>Starter prompts</span>
                        </strong>
                        <small>
                          Có câu mở đầu, bạn thêm giọng của mình.
                        </small>
                      </div>
                      <div className="local-table-chip-row">
                        {selectedTable.topicChips.map((chip) => (
                          <button
                            className={`local-table-chip trend-chip-${chip.tone}`}
                            key={chip.vi}
                            onClick={() => useLocalTablePrompt(chip)}
                            type="button"
                          >
                            <span aria-hidden="true" />
                            {chip.vi}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="local-table-thread" aria-label={`${selectedTable.name} table conversation`}>
                      <div className="local-table-thread-heading">
                        <strong>
                          {localTableConfig.feedLabel.vi}
                          <span>{localTableConfig.feedLabel.en}</span>
                        </strong>
                      </div>
                      {selectedMessages.length ? (
                        selectedMessages.map((message, index) => {
                          const conversationMessage =
                            "name" in message ? message : null;

                          if (!conversationMessage) {
                            return null;
                          }

                          return (
                            <article
                              className="local-table-note"
                              key={`${conversationMessage.name}-${conversationMessage.text}-${index}`}
                            >
                              {renderPostAuthor({
                                author: conversationMessage.author,
                                fallbackName: conversationMessage.name,
                              })}
                              <p>{conversationMessage.text}</p>
                            </article>
                          );
                        })
                      ) : (
                        <div className="local-table-empty-state">
                          <strong>
                            {selectedTable.emptyState?.viTitle}
                            <span>{selectedTable.emptyState?.enTitle}</span>
                          </strong>
                          <p>{selectedTable.topic}</p>
                        </div>
                      )}
                    </section>

                    <form
                      className="conversation-form table-note-form local-table-form"
                      onSubmit={handleTableNoteSubmit}
                    >
                      <label htmlFor="table-note-message">
                        Góp một câu vào bàn
                        <span>Add one note to the table</span>
                      </label>
                      <p className="posting-helper table-safety-line">
                        Nói nhẹ. Giữ tên riêng tư.
                        <span>Keep it gentle. Keep names private.</span>
                      </p>
                      {renderAvatarPassportChip()}
                      <div className="message-row">
                        <input
                          id="table-note-message"
                          maxLength={selectedTablePostLimit}
                          onChange={(event) => {
                            setTableNoteDraft(event.target.value);
                            setTableNoteNotice(null);
                          }}
                          placeholder={selectedTable.composerPlaceholder}
                          ref={tableNoteInputRef}
                          type="text"
                          value={tableNoteDraft}
                        />
                        <button disabled={!canSubmitTableNote} type="submit">
                          Góp chuyện
                          <span>Add note</span>
                        </button>
                      </div>
                      {tableNoteNotice ? (
                        <p className="post-feedback">{tableNoteNotice}</p>
                      ) : null}
                      {shouldShowTableNoteCharacterCount ? (
                        <p className="character-count">
                          Còn {remainingTableNoteCharacters} /{" "}
                          {selectedTablePostLimit} ký tự.
                          <span>
                            {remainingTableNoteCharacters} of{" "}
                            {selectedTablePostLimit} characters left.
                          </span>
                        </p>
                      ) : null}
                    </form>

                    <details className="table-light-rules">
                      <summary>Nội quy nhẹ</summary>
                      <div>
                        {selectedTable.rules.map((rule) => (
                          <p key={rule.vi}>
                            {rule.vi}
                            <span>{rule.en}</span>
                          </p>
                        ))}
                      </div>
                    </details>
                  </QuanTamTableShell>
                ) : null}

                {isShopTalkTable && localTableConfig ? (
                  <div
                    className="front-counter-table-scene shop-talk-table-scene"
                    aria-label="Bàn Chuyện Nghề table scene"
                  >
                    <div className="front-counter-focused-stage shop-talk-focused-stage">
                      <div className="front-counter-artwork-frame">
                        <div className="front-counter-artwork-surface">
                          <img
                            alt="Bàn Chuyện Nghề nail salon room with warm tables, technician, client, NeoPao screen, appointment book, and conversation space"
                            className="front-counter-focused-image"
                            src={quanTamArtworkSources.shopTalk}
                          />
                          <div className="front-counter-scene-ambience" aria-hidden="true">
                            <span className="front-counter-ambient-glow front-counter-ambient-lantern" />
                            <span className="front-counter-ambient-glow front-counter-ambient-counter" />
                            <span className="front-counter-ambient-steam" />
                            <span className="front-counter-ambient-reflection" />
                          </div>
                          <div className="front-counter-focused-scrim" aria-hidden="true" />
                        </div>
                        <div className="shop-talk-room-caption">
                          <strong>
                            {getTableNameCopy(selectedTable.name).vi}
                            <span>{getTableNameCopy(selectedTable.name).en}</span>
                          </strong>
                          <p>{selectedTable.subtitle}</p>
                        </div>
                      </div>
                      <div
                        className="front-counter-stage-bubbles shop-talk-stage-feed"
                        aria-label="Bàn Chuyện Nghề visible notes"
                      >
                        {selectedMessages.length ? (
                          selectedMessages.map((message, index) => {
                            const conversationMessage =
                              "name" in message ? message : null;

                            if (!conversationMessage) {
                              return null;
                            }

                            const messageAuthor = conversationMessage.author;
                            const displayName =
                              messageAuthor?.nickname ?? conversationMessage.name;
                            const displayInitials = getNicknameInitials(displayName);

                            return (
                              <article
                                className={`front-counter-stage-bubble ${
                                  index % 2
                                    ? "front-counter-stage-bubble-right"
                                    : "front-counter-stage-bubble-left"
                                }`}
                                key={`${conversationMessage.name}-${conversationMessage.text}-${index}`}
                              >
                                <div className="front-counter-bubble-header">
                                  {messageAuthor?.avatarSrc ? (
                                    <img
                                      alt=""
                                      className="front-counter-bubble-avatar-image"
                                      src={messageAuthor.avatarSrc}
                                    />
                                  ) : (
                                    <img
                                      alt=""
                                      className="front-counter-bubble-avatar-image"
                                      src={CHO_NEO_AVATARS[0].src}
                                    />
                                  )}
                                  <div>
                                    <strong>
                                      {displayInitials}
                                      <span>{displayName}</span>
                                    </strong>
                                    {messageAuthor?.mood ? (
                                      <small>{messageAuthor.mood}</small>
                                    ) : null}
                                  </div>
                                </div>
                                <p>{conversationMessage.text}</p>
                              </article>
                            );
                          })
                        ) : (
                          <div className="front-counter-stage-bubble front-counter-stage-bubble-left">
                            <div className="front-counter-bubble-header">
                              <img
                                alt=""
                                className="front-counter-bubble-avatar-image"
                                src={CHO_NEO_AVATARS[0].src}
                              />
                              <div>
                                <strong>
                                  Bàn nghề
                                  <span>Shop Talk</span>
                                </strong>
                              </div>
                            </div>
                            <p>{selectedTable.emptyState?.viTitle ?? selectedTable.topic}</p>
                          </div>
                        )}
                      </div>
                      <form
                        className="front-counter-stage-form shop-talk-stage-form"
                        onClick={(event) => {
                          if (
                            event.target instanceof HTMLElement &&
                            !event.target.closest("button, a")
                          ) {
                            tableNoteInputRef.current?.focus();
                          }
                        }}
                        onSubmit={handleTableNoteSubmit}
                      >
                        {renderAvatarPassportChip()}
                        <div className="front-counter-stage-message-row">
                          <button
                            aria-label="Use your Chợ Neo avatar"
                            className="front-counter-input-avatar"
                            onClick={enterSelectedTable}
                            type="button"
                          >
                            {avatarProfile ? (
                              <>
                                <img alt="" src={avatarProfile.avatarSrc} />
                                <strong>
                                  {getNicknameInitials(
                                    avatarProfile.nickname || "Bạn làng"
                                  )}
                                </strong>
                              </>
                            ) : (
                              <>
                                <span aria-hidden="true">☕</span>
                                <strong>?</strong>
                              </>
                            )}
                          </button>
                          <input
                            id="table-note-message"
                            maxLength={selectedTablePostLimit}
                            onChange={(event) => {
                              setTableNoteDraft(event.target.value);
                              setTableNoteNotice(null);
                            }}
                            placeholder={selectedTable.composerPlaceholder}
                            ref={tableNoteInputRef}
                            type="text"
                            value={tableNoteDraft}
                          />
                          <button disabled={!canSubmitTableNote} type="submit">
                            <span className="front-counter-send-icon" aria-hidden="true">
                              ↗
                            </span>
                            <span className="front-counter-send-copy">Góp chuyện</span>
                          </button>
                        </div>
                        <p className="front-counter-stage-safety">
                          <span className="front-counter-safety-leaf" aria-hidden="true">
                            ❧
                          </span>
                          <span>
                            Nói nhẹ. Giữ tên riêng tư.
                            <small>Keep it gentle. Keep names private.</small>
                          </span>
                        </p>
                        {tableNoteNotice ? (
                          <p className="front-counter-stage-feedback">
                            {tableNoteNotice}
                          </p>
                        ) : shouldShowTableNoteCharacterCount ? (
                          <p className="front-counter-stage-count">
                            Còn {remainingTableNoteCharacters} ký tự
                            <span>{remainingTableNoteCharacters} left</span>
                          </p>
                        ) : null}
                      </form>
                      <section
                        className="front-counter-stage-form shop-talk-prompt-strip"
                        aria-label="Bàn Chuyện Nghề starter prompts"
                      >
                        <div>
                          <strong>Gợi mở chuyện</strong>
                        </div>
                        <div className="shop-talk-prompt-row">
                          {selectedTable.topicChips.map((chip) => (
                            <button
                              className={`shop-talk-prompt-chip trend-chip-${chip.tone}`}
                              key={chip.vi}
                              onClick={() => useLocalTablePrompt(chip)}
                              type="button"
                            >
                              {chip.vi}
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                ) : null}

                {isFrontCounter ? (
                  <div
                    className="front-counter-table-scene"
                    aria-label="Social Counter café table scene"
                  >
                    <div
                      className={`front-counter-focused-stage ${
                        frontCounterDrawerOpen
                          ? "front-counter-focused-stage-drawer-open"
                          : ""
                      }`}
                    >
                      <div className="front-counter-artwork-frame">
                        <div className="front-counter-artwork-surface">
                          <img
                            alt="Warm Social Counter table inside Quán Tám with café counter, stools, wood floor, cups, receipts, and nail community details"
                            className="front-counter-focused-image"
                            src={quanTamArtworkSources.frontCounter}
                          />
                          <div className="front-counter-scene-ambience" aria-hidden="true">
                            <span className="front-counter-ambient-glow front-counter-ambient-lantern" />
                            <span className="front-counter-ambient-glow front-counter-ambient-counter" />
                            <span className="front-counter-ambient-steam" />
                            <span className="front-counter-ambient-reflection" />
                          </div>
                          <div className="front-counter-focused-scrim" aria-hidden="true" />
                        </div>
                      </div>
                      <section
                        className="front-counter-conversation-panel"
                        aria-labelledby="front-counter-conversation-title"
                      >
                        <header className="front-counter-conversation-heading">
                          <h3 id="front-counter-conversation-title">
                            Đang trò chuyện
                          </h3>
                        </header>
                        <div
                          className="front-counter-conversation-stream"
                          role="list"
                          aria-label="Quầy Xã Giao public conversation"
                        >
                          {selectedMessages.length ? (
                            selectedMessages.map((message) => {
                              const frontCounterMessage =
                                "avatarId" in message ? message : null;
                              const conversationMessage =
                                "name" in message ? message : null;
                              const isRemoved = !!frontCounterMessage?.removedAt;
                              const reportedByThisBrowser =
                                !!frontCounterMessage &&
                                reportedMessageIds.includes(frontCounterMessage.id);
                              const isBusy =
                                !!frontCounterMessage &&
                                moderationBusyMessageId === frontCounterMessage.id;
                              const hasSharedDatabaseId =
                                !!frontCounterMessage &&
                                isSharedFrontCounterMessageId(frontCounterMessage.id);
                              const canModeratePersistedMessage =
                                frontCounterMemoryMode !== "shared" ||
                                (hasSharedDatabaseId &&
                                  sharedFetchedMessageIds.includes(frontCounterMessage.id));
                              const displayName = frontCounterMessage
                                ? isRemoved
                                  ? "Village host"
                                  : frontCounterMessage.author?.nickname ??
                                    frontCounterMessage.nickname
                                : conversationMessage?.author?.nickname ??
                                  conversationMessage?.name ??
                                  "";
                              const messageAvatar = frontCounterMessage
                                ? getAvatarById(frontCounterMessage.avatarId)
                                : null;
                              const messageAuthor =
                                frontCounterMessage?.author ?? conversationMessage?.author;
                              const fallbackInitials = getNicknameInitials(displayName);
                              const messageTime = formatFrontCounterMessageTime(
                                frontCounterMessage?.createdAt
                              );

                              return (
                                <article
                                  className={`front-counter-conversation-message ${
                                    isRemoved ? "front-counter-conversation-message-muted" : ""
                                  }`}
                                  key={
                                    "id" in message
                                      ? `conversation-${message.id}`
                                      : `conversation-${message.name}-${message.text}`
                                  }
                                  role="listitem"
                                >
                                  <div className="front-counter-conversation-avatar">
                                    {messageAuthor?.avatarSrc ? (
                                      <img alt="" src={messageAuthor.avatarSrc} />
                                    ) : messageAvatar ? (
                                      <img alt="" src={messageAvatar.src} />
                                    ) : (
                                      <span aria-hidden="true">{fallbackInitials}</span>
                                    )}
                                  </div>
                                  <div className="front-counter-conversation-copy">
                                    <div className="front-counter-conversation-meta">
                                      <strong>{displayName}</strong>
                                      {messageTime ? (
                                        <time dateTime={frontCounterMessage?.createdAt}>
                                          {messageTime}
                                        </time>
                                      ) : null}
                                    </div>
                                    <p>{message.text}</p>
                                    {frontCounterMessage && !isRemoved ? (
                                      <div className="front-counter-conversation-actions">
                                        <button
                                          onClick={() =>
                                            replyToFrontCounterMessage(displayName)
                                          }
                                          type="button"
                                        >
                                          Trả lời
                                        </button>
                                        <button
                                          disabled={
                                            isBusy ||
                                            reportedByThisBrowser ||
                                            !identity ||
                                            !canModeratePersistedMessage
                                          }
                                          onClick={() =>
                                            reportFrontCounterMessage(frontCounterMessage)
                                          }
                                          type="button"
                                        >
                                          {reportedByThisBrowser ? "Đã báo cáo" : "Báo cáo"}
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </article>
                              );
                            })
                          ) : (
                            <p className="front-counter-conversation-empty">
                              Quầy đang yên lúc này. / The counter is quiet right now.
                            </p>
                          )}
                        </div>
                      </section>
                      <form
                        className="front-counter-stage-form"
                        onClick={(event) => {
                          if (
                            event.target instanceof HTMLElement &&
                            !event.target.closest("button")
                          ) {
                            ensureFrontCounterComposerReady();
                            frontCounterInputRef.current?.focus();
                          }
                        }}
                        onSubmit={handleFrontCounterSubmit}
                      >
                        {renderAvatarPassportChip()}
                        <div className="front-counter-stage-message-row">
                          <input
                            disabled={frontCounterPosting}
                            id="front-counter-stage-message"
                            maxLength={FRONT_COUNTER_MESSAGE_LIMIT}
                            onChange={(event) => {
                              ensureFrontCounterComposerReady();
                              frontCounterDraftRef.current = event.target.value;
                              setFrontCounterDraft(event.target.value);
                              setFrontCounterPostNotice(null);
                            }}
                            onFocus={ensureFrontCounterComposerReady}
                            placeholder="Nói một câu..."
                            ref={frontCounterInputRef}
                            type="text"
                            value={frontCounterDraft}
                          />
                          <button
                            disabled={
                              !canSubmitFrontCounterMessage ||
                              frontCounterPosting
                            }
                            onClick={() => {
                              void submitFrontCounterDraft();
                            }}
                            type="button"
                          >
                            <span className="front-counter-send-icon" aria-hidden="true">
                              ↗
                            </span>
                            <span className="front-counter-send-copy">
                              {frontCounterPosting ? "Đang gửi..." : "Gửi"}
                            </span>
                          </button>
                        </div>
                        <p className="front-counter-stage-safety">
                          <span className="front-counter-safety-leaf" aria-hidden="true">
                            ❧
                          </span>
                          <span>
                            Nói nhẹ. Giữ tên riêng tư.
                            <small>Keep it gentle. Keep names private.</small>
                          </span>
                        </p>
                        {frontCounterPostNotice ? (
                          <p className="front-counter-stage-feedback">
                            {frontCounterPostNotice}
                          </p>
                        ) : null}
                      </form>
                      {frontCounterDrawerOpen ? (
                        <div className="front-counter-stage-drawer">
                          <div className="front-counter-stage-drawer-heading">
                            <div>
                              <strong>
                                Chuyện ở bàn
                                <span>Table thread</span>
                              </strong>
                              <p>
                                Tin thật của làng, tin cũ hơn, và nội quy gọn.
                                <span>
                                  Real village notes, older messages, and compact etiquette.
                                </span>
                              </p>
                            </div>
                            <div className="front-counter-stage-drawer-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  setHostToolsOpen((isOpen) => !isOpen)
                                }
                              >
                                Host
                                <span>Tools</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setFrontCounterDrawerOpen(false)}
                              >
                                Đóng
                                <span>Close</span>
                              </button>
                            </div>
                          </div>
                          <details className="front-counter-stage-etiquette table-light-rules">
                            <summary>Nội quy nhẹ</summary>
                            <div>
                              <p>
                                Nói nhỏ. Nói thật. Giữ riêng tư.
                                <span>Talk softly. Be real. Keep privacy.</span>
                              </p>
                            </div>
                          </details>
                          {moderationNotice ? (
                            <p className="front-counter-stage-drawer-notice">
                              {moderationNotice}
                            </p>
                          ) : null}
                          {hostToolsOpen ? (
                            <div className="front-counter-stage-host-tools">
                              <div>
                                <strong>Host</strong>
                                <p>Báo cáo / Report · Ẩn / Hide · Gỡ / Remove</p>
                              </div>
                              <input
                                aria-label="Cho Neo host key"
                                onChange={(event) => {
                                  setHostKey(event.target.value);
                                  setHostReviewMessages([]);
                                  setHostReviewNotice(null);
                                  setHostReviewUnlocked(false);
                                }}
                                placeholder="Host key"
                                type="password"
                                value={hostKey}
                              />
                              <div className="front-counter-stage-host-actions">
                                <button
                                  disabled={hostReviewLoading}
                                  onClick={() => void loadHostReviewMessages()}
                                  type="button"
                                >
                                  {hostReviewLoading
                                    ? "Opening..."
                                    : hostReviewUnlocked
                                      ? "Refresh"
                                      : "Open"}
                                </button>
                                {hostReviewUnlocked ? (
                                  <button type="button" onClick={closeHostReview}>
                                    Close
                                  </button>
                                ) : null}
                              </div>
                              {hostReviewNotice ? (
                                <p className="front-counter-stage-drawer-notice">
                                  {hostReviewNotice}
                                </p>
                              ) : null}
                              {hostReviewUnlocked ? (
                                <div className="front-counter-stage-host-review">
                                  {hostReviewMessages.length ? (
                                    hostReviewMessages.map((message) => {
                                      const labels = getHostReviewLabels(message);
                                      const isRemoved = !!message.removedAt;
                                      const isHidden = !!message.hiddenAt;
                                      const hasReports = (message.reportCount ?? 0) > 0;
                                      const isBusy =
                                        moderationBusyMessageId === message.id;

                                      return (
                                        <div
                                          className="front-counter-stage-host-card"
                                          key={`host-${message.id}`}
                                        >
                                          <small>{message.nickname}</small>
                                          <p>{message.text}</p>
                                          <div>
                                            {labels.map((label) => (
                                              <span key={label}>{label}</span>
                                            ))}
                                            {hasReports ? (
                                              <span>
                                                {message.reportCount} report
                                                {message.reportCount === 1 ? "" : "s"}
                                              </span>
                                            ) : null}
                                          </div>
                                          {!isRemoved || hasReports ? (
                                            <div className="front-counter-bubble-controls">
                                              {!isRemoved && !isHidden ? (
                                                <button
                                                  disabled={isBusy}
                                                  onClick={() =>
                                                    moderateFrontCounterMessage(
                                                      "hide",
                                                      message
                                                    )
                                                  }
                                                  type="button"
                                                >
                                                  Ẩn
                                                  <span>Hide</span>
                                                </button>
                                              ) : null}
                                              {!isRemoved ? (
                                                <button
                                                  disabled={isBusy}
                                                  onClick={() =>
                                                    moderateFrontCounterMessage(
                                                      "remove",
                                                      message
                                                    )
                                                  }
                                                  type="button"
                                                >
                                                  Gỡ
                                                  <span>Remove</span>
                                                </button>
                                              ) : null}
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="front-counter-stage-drawer-notice">
                                      No village host issues right now.
                                    </p>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="front-counter-stage-thread">
                            {selectedMessages.length ? (
                              selectedMessages.map((message, index) => {
                                const frontCounterMessage =
                                  "avatarId" in message ? message : null;
                                const conversationMessage =
                                  "name" in message ? message : null;
                                const isRemoved = !!frontCounterMessage?.removedAt;
                                const reportedByThisBrowser =
                                  !!frontCounterMessage &&
                                  reportedMessageIds.includes(frontCounterMessage.id);
                                const isBusy =
                                  !!frontCounterMessage &&
                                  moderationBusyMessageId === frontCounterMessage.id;
                                const hasSharedDatabaseId =
                                  !!frontCounterMessage &&
                                  isSharedFrontCounterMessageId(frontCounterMessage.id);
                                const canModeratePersistedMessage =
                                  frontCounterMemoryMode !== "shared" ||
                                  (hasSharedDatabaseId &&
                                    sharedFetchedMessageIds.includes(frontCounterMessage.id));
                                const displayName = frontCounterMessage
                                  ? isRemoved
                                    ? "Village host"
                                    : frontCounterMessage.nickname
                                  : conversationMessage?.name ?? "";
                                const messageAvatar = frontCounterMessage
                                  ? getAvatarById(frontCounterMessage.avatarId)
                                  : null;
                                const messageAvatarCopy = frontCounterMessage
                                  ? getGossipAvatarCopy(frontCounterMessage.avatarId)
                                  : null;
                                const messageAuthor =
                                  frontCounterMessage?.author ?? conversationMessage?.author;

                                return (
                                  <div
                                    className={`front-counter-stage-thread-note ${
                                      index % 2 ? "thread-note-warm" : ""
                                    } ${isRemoved ? "thread-note-muted" : ""}`}
                                    key={
                                      "id" in message
                                        ? `drawer-${message.id}`
                                        : `drawer-${message.name}-${message.text}`
                                    }
                                  >
                                    <div className="front-counter-bubble-header">
                                      {messageAuthor?.avatarSrc ? (
                                        <img
                                          alt=""
                                          className="front-counter-bubble-avatar-image"
                                          src={messageAuthor.avatarSrc}
                                        />
                                      ) : messageAvatar ? (
                                        <img
                                          alt=""
                                          className="front-counter-bubble-avatar-image"
                                          src={messageAvatar.src}
                                        />
                                      ) : null}
                                      <div>
                                        <strong>
                                          {messageAuthor?.nickname ??
                                            getNicknameInitials(displayName)}
                                          {messageAuthor?.nickname ? null : (
                                            <span>{displayName}</span>
                                          )}
                                        </strong>
                                        {messageAuthor?.mood ? (
                                          <small>{messageAuthor.mood}</small>
                                        ) : messageAvatar && messageAvatarCopy ? (
                                          <small>
                                            {messageAvatarCopy.name}
                                            <span>{messageAvatar.name}</span>
                                          </small>
                                        ) : null}
                                      </div>
                                    </div>
                                    <p>{message.text}</p>
                                    {frontCounterMessage && !isRemoved ? (
                                      <div className="front-counter-bubble-controls">
                                        <button
                                          disabled={
                                            isBusy ||
                                            reportedByThisBrowser ||
                                            !identity ||
                                            !canModeratePersistedMessage
                                          }
                                          onClick={() =>
                                            reportFrontCounterMessage(frontCounterMessage)
                                          }
                                          type="button"
                                        >
                                          {reportedByThisBrowser ? "Đã báo cáo" : "Báo cáo"}
                                          <span>
                                            {reportedByThisBrowser ? "Reported" : "Report"}
                                          </span>
                                        </button>
                                        {hostReviewUnlocked ? (
                                          <>
                                            <button
                                              disabled={isBusy || !canModeratePersistedMessage}
                                              onClick={() =>
                                                moderateFrontCounterMessage(
                                                  "hide",
                                                  frontCounterMessage
                                                )
                                              }
                                              type="button"
                                            >
                                              Ẩn
                                              <span>Hide</span>
                                            </button>
                                            <button
                                              disabled={isBusy || !canModeratePersistedMessage}
                                              onClick={() =>
                                                moderateFrontCounterMessage(
                                                  "remove",
                                                  frontCounterMessage
                                                )
                                              }
                                              type="button"
                                            >
                                              Gỡ
                                              <span>Remove</span>
                                            </button>
                                          </>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="front-counter-stage-drawer-notice">
                                Quầy đang yên lúc này. / The counter is quiet right now.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {isTrendTable ? (
                  <div className="trend-table-scene" aria-label="Bàn Màu visual table">
                    <div className="trend-table-stage">
                      <img
                        alt="Warm Trend Table inside Quán Tám for nail color, style ideas, product colors, seasonal looks, and client requests"
                        src={selectedTable.artwork ?? COLOR_TREND_STAGE_IMAGE_SRC}
                      />
                    </div>
                    <div className="trend-table-hero-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <section
                      className="trend-table-topic-chips"
                      aria-label="Bàn Màu topic ideas"
                    >
                      <div>
                        <strong>Mở chuyện bằng màu</strong>
                      </div>
                      <div className="trend-table-chip-row">
                        {selectedTable.topicChips.map((chip) => (
                          <button
                            className={`trend-table-topic-chip trend-chip-${chip.tone}`}
                            key={chip.vi}
                            onClick={() => useTrendTablePrompt(chip)}
                            type="button"
                          >
                            <span aria-hidden="true" />
                            {chip.vi}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : null}


                {isFrontCounter && moderationNotice ? (
                  <p className="moderation-notice">{moderationNotice}</p>
                ) : null}

                {isFrontCounter && hostToolsOpen && hostReviewNotice ? (
                  <p className="moderation-notice">{hostReviewNotice}</p>
                ) : null}

                {isFrontCounter ? (
                  <>
                    <div className="daily-table-talk">
                      <p>
                        Chuyện Bàn Hôm Nay
                        <span>Today&apos;s Table Talk</span>
                      </p>
                      <strong>
                        Khách hay làm chuyện nhỏ gì mà khiến cả tiệm bị chậm
                        lại?
                        <span>
                          What small client habit secretly slows the whole shop
                          down?
                        </span>
                      </strong>
                      <span>
                        Kể chuyện trong tiệm cho vui và có ích. Viết tiếng
                        Việt hay Vietlish đều được. Đừng nêu tên khách, đừng
                        công kích cá nhân, đừng spam bán hàng.
                        <small>
                          Share a real shop moment. Vietnamese or Vietlish is
                          welcome. No client names, no personal attacks, no
                          selling spam.
                        </small>
                      </span>
                    </div>

                    <div className="front-counter-atmosphere">
                      <strong>
                        Mọi người hay bàn gì ở quầy này
                        <span>What people trade at this counter</span>
                      </strong>
                      <div>
                        {FRONT_COUNTER_TALK_EXAMPLES.map((example) => (
                          <span key={example}>{example}</span>
                        ))}
                      </div>
                      <p>
                        Some remembered notes may be from earlier seatings.
                        Leave a fresh one when the shop day gives you something
                        useful for the village.
                      </p>
                    </div>
                  </>
                ) : null}

                {!isLocalSessionTable ? (
                <div
                  className={`mock-thread ${
                    isTrendTable ? "trend-table-thread" : ""
                  }`}
                  aria-label={`${selectedTable.name} sample conversation`}
                >
                  {isTrendTable ? (
                    <div className="trend-table-thread-heading">
                      <strong>Chuyện màu mới</strong>
                    </div>
                  ) : null}
                  {selectedMessages.length ? (
                    selectedMessages.map((message, index) => {
                      const frontCounterMessage =
                        "avatarId" in message ? message : null;
                      const conversationMessage =
                        "name" in message ? message : null;
                      const isRemoved = !!frontCounterMessage?.removedAt;
                      const reportedByThisBrowser =
                        !!frontCounterMessage &&
                        reportedMessageIds.includes(frontCounterMessage.id);
                      const isBusy =
                        !!frontCounterMessage &&
                        moderationBusyMessageId === frontCounterMessage.id;
                      const hasSharedDatabaseId =
                        !!frontCounterMessage &&
                        isSharedFrontCounterMessageId(frontCounterMessage.id);
                      const canModeratePersistedMessage =
                        frontCounterMemoryMode !== "shared" ||
                        (hasSharedDatabaseId &&
                          sharedFetchedMessageIds.includes(frontCounterMessage.id));
                      const displayName = frontCounterMessage
                        ? isRemoved
                          ? "Village host"
                          : frontCounterMessage.nickname
                        : conversationMessage?.name ?? "";

                      return (
                        <div
                          className={`thread-message ${
                            index % 2 ? "thread-message-right" : "thread-message-left"
                          } ${isRemoved ? "thread-message-removed" : ""}`}
                          key={"id" in message ? message.id : `${message.name}-${message.text}`}
                        >
                          {renderPostAuthor({
                            author: frontCounterMessage?.author ?? conversationMessage?.author,
                            className: "thread-author-chip",
                            fallbackAvatarId: frontCounterMessage?.avatarId,
                            fallbackName: displayName,
                          })}
                          <p>{message.text}</p>
                          {"reactions" in message && message.reactions && !isRemoved ? (
                            <span className="reaction-row" aria-hidden="true">
                              {message.reactions.heart ? `heart ${message.reactions.heart}` : ""}
                              {message.reactions.laugh ? ` laugh ${message.reactions.laugh}` : ""}
                              {message.reactions.tea ? ` tea ${message.reactions.tea}` : ""}
                            </span>
                          ) : null}
                          {frontCounterMessage && !isRemoved ? (
                            <div className="moderation-row">
                              <button
                                className={isTrendTable ? "trend-table-report-action" : undefined}
                                disabled={
                                  isBusy ||
                                  reportedByThisBrowser ||
                                  !identity ||
                                  !canModeratePersistedMessage
                                }
                                onClick={() =>
                                  reportFrontCounterMessage(frontCounterMessage)
                              }
                              type="button"
                            >
                                {isTrendTable ? (
                                  <>
                                    <svg
                                      aria-hidden="true"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M6.5 20V5.8m0 0c2.3-1.1 4.2.7 6.4-.2 1.5-.6 2.4-1.2 4.6-.3v8.1c-2.1-.9-3.1-.3-4.6.3-2.2.9-4.1-.9-6.4.2V5.8Z"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.8"
                                      />
                                    </svg>
                                    {reportedByThisBrowser ? "Đã báo cáo" : "Báo cáo"}
                                  </>
                                ) : reportedByThisBrowser ? (
                                  <>
                                    Đã báo cáo
                                    <span>Reported</span>
                                  </>
                                ) : (
                                  <>
                                    Báo cáo
                                    <span>Report</span>
                                  </>
                                )}
                            </button>
                              {(frontCounterMessage.reportCount ?? 0) > 0 ? (
                                <span>
                                  {frontCounterMessage.reportCount} report
                                  {frontCounterMessage.reportCount === 1 ? "" : "s"}
                                </span>
                              ) : null}
                              {hostReviewUnlocked ? (
                                <>
                                  <button
                                    disabled={isBusy || !canModeratePersistedMessage}
                                    onClick={() =>
                                      moderateFrontCounterMessage(
                                        "hide",
                                        frontCounterMessage
                                      )
                                    }
                                    type="button"
                                  >
                                    Ẩn
                                    <span>Hide</span>
                                  </button>
                                  <button
                                    disabled={
                                      isBusy ||
                                      !canModeratePersistedMessage
                                    }
                                    onClick={() =>
                                      moderateFrontCounterMessage(
                                        "remove",
                                        frontCounterMessage
                                      )
                                    }
                                    type="button"
                                  >
                                    Gỡ
                                    <span>Remove</span>
                                  </button>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : isFrontCounter ? (
                    <div className="front-counter-empty-state">
                      <strong>
                        Quầy đang yên lúc này.
                        <span>The counter is quiet right now.</span>
                      </strong>
                      <p>
                        Bắt đầu bằng một ghi chú tiệm nhỏ: màu nào đang chạy,
                        món supply nào cứu buổi sáng, hoặc walk-in hôm nay có
                        nhẹ không.
                        <span>
                          Start with a small shop note: what color is moving,
                          which supply saved the morning, or whether walk-ins
                          are light today.
                        </span>
                      </p>
                    </div>
                  ) : isTrendTable ? (
                    <div className="trend-table-starter-list">
                      <div className="trend-table-empty-copy">
                        <strong>Chưa có chuyện mới.</strong>
                        <p>Bắt đầu bằng một câu hỏi nhé.</p>
                      </div>
                      <div>
                        {COLOR_TREND_CONVERSATION_STARTERS.map((starter) => (
                          <button
                            key={starter.vi}
                            onClick={() => useTrendTablePrompt(starter)}
                            type="button"
                          >
                            {starter.vi}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                ) : null}

                {!isFrontCounter && !isLocalSessionTable ? (
                  <form
                    className="conversation-form table-note-form"
                    onSubmit={handleTableNoteSubmit}
                  >
                    {!isTrendTable ? (
                      <p className="prototype-note">
                        Ghi chú ở bàn này ở lại trong phiên quán hiện tại. / This
                        table note stays in the current café session.
                      </p>
                    ) : null}
                    {!isTrendTable ? (
                      <label htmlFor="table-note-message">
                        Ngồi xuống góp chuyện
                        <span>Take a seat and add a note</span>
                      </label>
                    ) : null}
                    <p
                      aria-label={
                        isTrendTable
                          ? "Nói nhẹ. Giữ tên riêng tư. Keep it gentle. Keep names private."
                          : undefined
                      }
                      className="posting-helper table-safety-line"
                    >
                      Nói nhẹ. Giữ tên riêng tư.
                      {!isTrendTable ? <span>Keep it gentle. Keep names private.</span> : null}
                    </p>
                    {renderAvatarPassportChip()}
                    <div className="message-row">
                      <input
                        id="table-note-message"
                        maxLength={selectedTablePostLimit}
                        onChange={(event) => {
                          setTableNoteDraft(event.target.value);
                          setTableNoteNotice(null);
                        }}
                        placeholder={
                          isTrendTable
                            ? selectedTable.composerPlaceholder
                            : selectedTable.composerPlaceholder
                        }
                        ref={tableNoteInputRef}
                        type="text"
                        value={tableNoteDraft}
                      />
                      <button
                        aria-label={
                          isTrendTable
                            ? "Đặt lên bàn / Put it on the table"
                            : undefined
                        }
                        title={
                          isTrendTable
                            ? "Đặt lên bàn / Put it on the table"
                            : undefined
                        }
                        disabled={!canSubmitTableNote}
                        type="submit"
                      >
                        {isTrendTable ? (
                          <svg
                            aria-hidden="true"
                            fill="none"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="m4.8 12 13.7-6.4-3.7 12.8-3.1-5.1-6.9-1.3Z"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.8"
                            />
                            <path
                              d="m11.7 13.3 3.4-3.7"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.8"
                            />
                          </svg>
                        ) : (
                          <>
                            Góp chuyện
                            <span>Add note</span>
                          </>
                        )}
                      </button>
                    </div>
                    {tableNoteNotice ? (
                      <p className="post-feedback">{tableNoteNotice}</p>
                    ) : null}
                    {shouldShowTableNoteCharacterCount ? (
                      <p className="character-count">
                        Còn {remainingTableNoteCharacters} /{" "}
                        {selectedTablePostLimit} ký tự.
                        <span>
                          {remainingTableNoteCharacters} of{" "}
                          {selectedTablePostLimit} characters left.
                        </span>
                      </p>
                    ) : null}
                  </form>
                ) : null}

                {!isTrendTable && !isFrontCounter && !isLocalSessionTable ? (
                  <button
                    className="leave-button"
                    type="button"
                    onClick={() => setSelectedTableName(null)}
                  >
                    Về tất cả bàn
                    <span>Back to all tables</span>
                  </button>
                ) : null}
              </div>
            </article>
          ) : (
            <>
              <div className="gossip-image-lobby">
                <div className="gossip-room-stage">
                  <img
                    alt="Quán Tám isometric café room with five empty table zones, warm lanterns, a small espresso bar, and nail café details"
                    className="gossip-room-image"
                    src={quanTamArtworkSources.lobby}
                  />
                  <div className="gossip-room-scrim" aria-hidden="true" />
                  {/* Future approved café audio can hook in here; no audio element is rendered, so there is no autoplay. */}

                  <div className="gossip-hotspot-layer" aria-label="Quán Tám table zones">
                    {activeTables.map((table, tableIndex) => {
                      const tableNameCopy = getTableNameCopy(table.name);

                      return (
                        <article
                          aria-label={`${tableNameCopy.vi} / ${tableNameCopy.en}`}
                          className={`table-cluster table-hotspot table-hotspot-${
                            tableIndex + 1
                          } table-${table.tone}`}
                          key={table.name}
                          onClick={() => openTable(table.name)}
                          onKeyDown={(event) => handleTableKeyDown(event, table.name)}
                          role="button"
                          tabIndex={0}
                        >
                          <span className="hotspot-glow" aria-hidden="true" />
                          <div className="hotspot-label">
                            <p>
                              {tableNameCopy.vi}
                              <span>{tableNameCopy.en}</span>
                            </p>
                            <strong>{table.topic}</strong>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openTable(table.name);
                              }}
                            >
                              Vào bàn
                              <span>Take a seat</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>

              <nav className="mobile-table-picker" aria-label="Chọn bàn Quán Tám">
                <div className="mobile-table-picker-heading">
                  <strong>Chọn bàn</strong>
                  <span>Choose a table</span>
                </div>
                <div className="mobile-table-picker-grid">
                  {activeTables.map((table) => {
                    const tableNameCopy = getTableNameCopy(table.name);

                    return (
                      <button
                        className={`mobile-table-card table-${table.tone}`}
                        key={`mobile-${table.name}`}
                        onClick={() => openTable(table.name)}
                        type="button"
                        >
                          <strong>
                            {tableNameCopy.vi}
                            <span>{tableNameCopy.en}</span>
                          </strong>
                          <small>{table.topic}</small>
                        <em>
                          Vào bàn / Take a seat
                        </em>
                      </button>
                    );
                  })}
                </div>
              </nav>
            </>
          )}
        </section>

          </>
      </section>

      {rulesAcknowledgementOpen ? (
        <section
          className="gossip-rules-acknowledgement"
          aria-label="Nội Quy Quán Tám"
          aria-modal="true"
          role="dialog"
        >
          <div className="gossip-rules-card">
            <p className="eyebrow">
              Trước khi ngồi xuống
              <span>Before you sit down</span>
            </p>
            <h2>Nội Quy Quán Tám</h2>
            <ul>
              <li>Nói nhỏ. Nói thật. Giữ riêng tư.</li>
              <li>Không gọi tên người thật để công kích.</li>
              <li>Không spam bán hàng.</li>
              <li>Không kéo drama qua bàn khác.</li>
              <li>Bàn nào có chuyện của bàn đó.</li>
            </ul>
            <p>
              Vui thì ngồi lại. Mệt thì thở một chút. Nhưng đừng làm đau người khác.
            </p>
            <button type="button" onClick={acceptGossipRules}>
              Tôi hiểu, vào Quán Tám
            </button>
          </div>
        </section>
      ) : null}

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
        }

        .cafe-page {
          --room-pass2-text-primary: #f7eee8;
          --room-pass2-text-secondary: rgba(247, 238, 232, 0.78);
          --room-pass2-text-muted: rgba(247, 238, 232, 0.6);
          --room-pass2-border: rgba(217, 141, 126, 0.34);
          --room-pass2-border-soft: rgba(217, 141, 126, 0.22);
          --room-pass2-surface: rgba(72, 40, 34, 0.9);
          --room-pass2-surface-soft: rgba(60, 34, 30, 0.82);
          --room-pass2-control: rgba(91, 49, 42, 0.86);
          --cho-neo-text-primary: var(--room-pass2-text-primary);
          --cho-neo-text-accent: #efb8aa;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: var(--cho-neo-text-primary);
          background:
            radial-gradient(circle at 50% 18%, rgba(189, 91, 65, 0.2), transparent 34rem),
            linear-gradient(180deg, #130909 0%, #24110f 48%, #100808 100%);
          font-family: var(--cho-neo-font-ui);
          font-weight: 400;
        }

        .room-glow,
        .floor-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .room-glow {
          background: var(--cho-neo-room-glow-background);
        }

        .floor-grid {
          display: none;
        }

        .cafe-shell {
          position: relative;
          z-index: 1;
          width: min(1240px, 100%);
          margin: 0 auto;
          padding: 16px 20px 22px;
        }

        .cafe-hero {
          display: block;
          padding: 0 2px;
        }

        .cafe-hero-actions {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
        }

        .cafe-theme-audio {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          width: auto;
          min-width: 0;
          height: 44px;
        }

        h1 {
          margin: 0;
          font-family: var(--cho-neo-font-display);
          font-size: clamp(38px, 5vw, 54px);
          font-weight: 600;
          line-height: 0.96;
          letter-spacing: 0;
          text-wrap: balance;
        }

        h1 span {
          display: block;
          margin-top: 8px;
          color: var(--room-pass2-text-secondary);
          font-size: 0.3em;
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: 0;
        }

        .subtitle {
          max-width: 520px;
          margin: 8px 0 0;
          color: var(--room-pass2-text-secondary);
          font-size: clamp(13px, 1.35vw, 16px);
          font-weight: 400;
          line-height: 1.35;
        }

        .subtitle span {
          display: block;
          margin-top: 3px;
          color: var(--room-pass2-text-muted);
          font-size: 0.82em;
          line-height: 1.25;
        }

        .cafe-stage-controls {
          display: flex;
          flex-wrap: nowrap;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          margin: 14px 2px 10px;
        }

        .cafe-control-row {
          display: flex;
          flex: 1 1 auto;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin: 0;
        }

        .cafe-control-pill {
          display: inline-flex;
          flex: 0 1 auto;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 44px;
          min-height: 44px;
          min-width: 0;
          padding: 0 12px;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 12px;
          background: rgba(255, 247, 237, 0.055);
          color: var(--room-pass2-text-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
          text-align: left;
          text-decoration: none;
          box-shadow: none;
          backdrop-filter: blur(10px);
          touch-action: manipulation;
        }

        .cafe-control-pill:hover,
        .cafe-control-pill:focus-visible {
          border-color: rgba(253, 230, 138, 0.54);
          outline: none;
          background: rgba(253, 230, 138, 0.12);
        }

        .cafe-control-pill-primary {
          border-color: rgba(253, 230, 138, 0.28);
          background: rgba(255, 247, 237, 0.065);
          color: var(--room-pass2-text-primary);
        }

        .cafe-control-pill-secondary {
          border-color: var(--room-pass2-border-soft);
          color: var(--room-pass2-text-secondary);
        }

        .cafe-control-pill-seated {
          border-color: rgba(134, 239, 172, 0.28);
          color: rgba(255, 247, 237, 0.84);
          background: rgba(22, 101, 52, 0.2);
        }

        .front-counter-count-pill {
          display: none;
        }

        .cafe-control-pill small {
          display: block;
          margin-top: 2px;
          color: var(--room-pass2-text-muted);
          font-size: 0.78em;
          font-weight: 400;
        }

        .cafe-hero-actions :global(.cho-neo-feedback-button) {
          box-sizing: border-box;
          display: inline-flex;
          flex: 0 0 auto;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          width: auto !important;
          min-width: 78px !important;
          min-height: 44px !important;
          height: 44px !important;
          border: 1px solid var(--room-pass2-border-soft) !important;
          border-radius: 12px !important;
          padding: 0 12px !important;
          color: var(--room-pass2-text-secondary) !important;
          background: rgba(255, 247, 237, 0.055) !important;
          box-shadow: none !important;
          cursor: pointer;
          font: inherit;
          font-size: 11px !important;
          font-weight: 500 !important;
          line-height: 1 !important;
          text-shadow: none !important;
        }

        .cafe-hero-actions :global(.cho-neo-feedback-button)::before {
          content: "♡" !important;
          color: #efb8aa !important;
          font-size: 13px !important;
          line-height: 1 !important;
          text-shadow: none !important;
        }

        .cafe-hero-actions :global(.cho-neo-feedback-button span) {
          display: inline !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          line-height: 1 !important;
        }

        .cafe-hero-actions :global(.cho-neo-feedback-button small) {
          display: none !important;
        }

        .cafe-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio) {
          flex: 0 0 auto !important;
          width: auto !important;
          min-width: 0 !important;
          height: 44px !important;
          min-height: 44px !important;
          border: 0 !important;
          border-radius: 12px !important;
          padding: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .cafe-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-audio-controls) {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: auto !important;
          height: 100% !important;
        }

        .cafe-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle) {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          width: auto !important;
          min-width: 78px !important;
          height: 44px !important;
          border: 1px solid var(--room-pass2-border-soft) !important;
          border-radius: 12px !important;
          padding: 0 12px !important;
          color: var(--room-pass2-text-secondary) !important;
          background: rgba(255, 247, 237, 0.055) !important;
          box-shadow: none !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          line-height: 1 !important;
          text-shadow: none !important;
        }

        .cafe-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle)::before {
          content: "♪";
          font-size: 14px;
          font-weight: 500;
          line-height: 1;
        }

        .cafe-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle)::after {
          content: "Nhạc";
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
        }

        .cafe-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle span) {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          overflow: hidden !important;
          clip: rect(0 0 0 0) !important;
          clip-path: inset(50%) !important;
        }

        .cafe-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle[aria-pressed="true"]) {
          color: var(--cho-neo-text-accent);
          text-shadow: none;
        }

        .front-counter-topic-note {
          flex: 0 1 auto;
          max-width: 100%;
          padding: 7px 11px;
          border: 1px solid rgba(92, 54, 27, 0.34);
          border-radius: 999px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.72), transparent 24%),
            linear-gradient(180deg, #f5e4c9, #e7cda5);
          color: #3d2417;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.42),
            0 10px 24px rgba(0, 0, 0, 0.12);
          transform: rotate(-0.4deg);
        }

        .front-counter-topic-note span {
          display: block;
        }

        .front-counter-topic-note span {
          font-size: 11px;
          font-weight: 600;
          line-height: 1.18;
        }

        .mobile-table-picker {
          display: none;
        }

        .gossip-rules-acknowledgement {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: grid;
          place-items: center;
          padding: 18px;
          background:
            radial-gradient(circle at 50% 18%, rgba(253, 230, 138, 0.16), transparent 34%),
            rgba(20, 13, 12, 0.72);
          backdrop-filter: blur(12px);
        }

        .gossip-rules-card {
          width: min(520px, 100%);
          padding: clamp(18px, 4vw, 26px);
          border: 1px solid rgba(253, 230, 138, 0.24);
          border-radius: 26px;
          background:
            radial-gradient(circle at 86% 0%, rgba(253, 230, 138, 0.16), transparent 30%),
            linear-gradient(180deg, rgba(96, 50, 34, 0.94), rgba(35, 22, 25, 0.96));
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        .gossip-rules-card h2 {
          margin: 0;
          color: var(--cho-neo-text-primary);
          font-family: var(--cho-neo-font-display);
          font-size: clamp(28px, 6vw, 42px);
          font-style: italic;
          line-height: 1;
          letter-spacing: -0.035em;
        }

        .gossip-rules-card ul {
          display: grid;
          gap: 8px;
          margin: 16px 0 0;
          padding: 0;
          list-style: none;
        }

        .gossip-rules-card li {
          padding: 9px 11px;
          border: 1px solid rgba(146, 64, 14, 0.14);
          border-radius: 14px;
          color: rgba(255, 247, 237, 0.84);
          background: rgba(255, 247, 237, 0.055);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.32;
        }

        .gossip-rules-card p:not(.eyebrow) {
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.76);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.4;
        }

        .gossip-rules-card button {
          width: 100%;
          min-height: 44px;
          margin-top: 16px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: linear-gradient(180deg, #fde68a, #fbbf24);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          box-shadow:
            0 12px 24px rgba(0, 0, 0, 0.22),
            0 0 20px rgba(251, 191, 36, 0.14);
        }

        .gossip-rules-card button:hover,
        .gossip-rules-card button:focus-visible {
          outline: none;
          box-shadow:
            0 12px 24px rgba(0, 0, 0, 0.22),
            0 0 0 4px rgba(253, 230, 138, 0.16),
            0 0 28px rgba(251, 191, 36, 0.26);
        }

        .cafe-control-pill small,
        button span,
        .identity-nudge span,
        .identity-picker h2 span,
        .identity-picker p span,
        .identity-form label span,
        .posting-as span,
        .identity-needed span,
        .seat-person > span small,
        .character-count span,
        .rules-heading p span,
        .house-rules h2 span,
        .host-note strong span,
        .host-note p span {
          display: block;
          margin-top: 3px;
          font-size: 0.82em;
          font-weight: 600;
          line-height: 1.25;
          letter-spacing: 0;
          opacity: 0.68;
          text-transform: none;
        }

        .identity-strip {
          display: grid;
          gap: 12px;
          margin-top: 12px;
        }

        .identity-strip:empty {
          display: none;
        }

        .current-identity,
        .identity-picker,
        .identity-nudge {
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 28, 0.62);
          box-shadow:
            0 18px 54px rgba(0, 0, 0, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }

        .current-identity {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          padding: 14px;
        }

        .avatar-token {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 30%, rgba(255, 247, 237, 0.2), transparent 34%),
            rgba(253, 230, 138, 0.12);
          box-shadow: 0 0 28px rgba(251, 191, 36, 0.12);
        }

        .avatar-token span {
          font-size: 30px;
        }

        .current-identity strong {
          display: block;
          color: var(--cho-neo-text-primary);
          font-size: 24px;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .current-identity div > span {
          display: block;
          margin-top: 6px;
          color: rgba(255, 247, 237, 0.68);
          font-size: 13px;
        }

        .current-identity div > span small {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          font-weight: 600;
          opacity: 0.68;
        }

        .current-identity button,
        .identity-picker button {
          min-height: 38px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 13px;
          font-weight: 600;
        }

        .current-identity button,
        .identity-picker button,
        .take-seat-button,
        .identity-needed button,
        .message-row button,
        .leave-button {
          line-height: 1.15;
        }

        .current-identity button {
          padding: 0 14px;
        }

        .identity-nudge {
          margin: 0;
          padding: 14px;
          color: rgba(255, 247, 237, 0.74);
          font-size: 14px;
          line-height: 1.5;
        }

        .identity-picker {
          display: grid;
          gap: 12px;
          padding: 14px;
        }

        .identity-picker-heading {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }

        .identity-picker h2 {
          margin: 0;
          font-family: var(--cho-neo-font-display);
          font-size: clamp(24px, 3.2vw, 36px);
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0;
        }

        .identity-picker p:not(.eyebrow) {
          margin: 8px 0 0;
          color: rgba(255, 247, 237, 0.7);
          font-size: 13px;
          line-height: 1.45;
        }

        .identity-picker-heading button {
          flex: 0 0 auto;
          padding: 0 12px;
          color: rgba(255, 247, 237, 0.86);
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .avatar-choice {
          display: grid;
          position: relative;
          gap: 7px;
          place-items: center;
          min-height: 146px;
          overflow: hidden;
          padding: 10px 9px 11px;
          color: var(--cho-neo-text-primary) !important;
          background:
            radial-gradient(circle at 50% 0%, rgba(253, 230, 138, 0.15), transparent 34%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.09), rgba(255, 247, 237, 0.035)),
            rgba(56, 32, 31, 0.58) !important;
          border: 1px solid rgba(253, 230, 138, 0.15) !important;
          border-radius: 18px !important;
          box-shadow:
            0 14px 34px rgba(0, 0, 0, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.09);
          isolation: isolate;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease;
        }

        .avatar-choice::before {
          content: "";
          position: absolute;
          inset: 10px;
          z-index: -1;
          border-radius: 16px;
          background:
            linear-gradient(180deg, transparent 0 48%, rgba(253, 230, 138, 0.07) 48% 100%),
            radial-gradient(circle at 50% 38%, rgba(255, 247, 237, 0.16), transparent 30%);
          opacity: 0.8;
        }

        .avatar-choice:hover,
        .avatar-choice:focus-visible {
          border-color: rgba(253, 230, 138, 0.4) !important;
          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.22),
            0 0 0 3px rgba(253, 230, 138, 0.08);
          transform: translateY(-2px);
        }

        .avatar-choice:focus-visible {
          outline: none;
        }

        .avatar-choice-portrait {
          position: relative;
          display: grid;
          place-items: center;
          width: 62px;
          height: 62px;
          border: 1px solid rgba(255, 247, 237, 0.22);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 30%, rgba(255, 247, 237, 0.6), transparent 28%),
            linear-gradient(180deg, rgba(254, 243, 199, 0.94), rgba(217, 119, 6, 0.3)),
            rgba(253, 230, 138, 0.22);
          box-shadow:
            0 16px 28px rgba(0, 0, 0, 0.2),
            inset 0 -12px 18px rgba(120, 53, 15, 0.16);
        }

        .avatar-choice-face {
          position: relative;
          display: block;
          width: 34px;
          height: 40px;
          border-radius: 44% 44% 48% 48%;
          background:
            radial-gradient(circle at 50% 96%, rgba(79, 34, 18, 0.32), transparent 18%),
            linear-gradient(180deg, #f7cfa6, #c97850);
          box-shadow:
            0 13px 0 -5px rgba(92, 43, 30, 0.8),
            0 16px 0 -6px rgba(253, 230, 138, 0.18);
        }

        .avatar-choice-eyes,
        .avatar-choice-eyes::after {
          position: absolute;
          top: 17px;
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: #3f2418;
          content: "";
        }

        .avatar-choice-eyes {
          left: 10px;
        }

        .avatar-choice-eyes::after {
          left: 12px;
          top: 0;
        }

        .avatar-choice-smile {
          position: absolute;
          left: 50%;
          bottom: 10px;
          width: 12px;
          height: 6px;
          border-bottom: 2px solid rgba(63, 36, 24, 0.68);
          border-radius: 0 0 999px 999px;
          transform: translateX(-50%);
        }

        .avatar-choice-charm {
          position: absolute;
          right: -3px;
          bottom: 0;
          display: grid;
          place-items: center;
          width: 23px;
          height: 23px;
          border: 1px solid rgba(253, 230, 138, 0.36);
          border-radius: 999px;
          background: rgba(25, 16, 18, 0.86);
          font-size: 13px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .avatar-choice strong {
          max-width: 100%;
          font-size: 12px;
          line-height: 1.15;
          text-align: center;
        }

        .avatar-choice strong span,
        .avatar-choice small span {
          display: block;
          margin-top: 2px;
          opacity: 0.68;
        }

        .avatar-choice small {
          color: rgba(255, 247, 237, 0.62);
          font-size: 10px;
          font-weight: 600;
          line-height: 1.28;
          text-align: center;
        }

        .avatar-choice-active {
          border-color: rgba(253, 230, 138, 0.58) !important;
          background:
            radial-gradient(circle at 50% 0%, rgba(253, 230, 138, 0.25), transparent 36%),
            linear-gradient(180deg, rgba(253, 230, 138, 0.18), rgba(255, 247, 237, 0.06)),
            rgba(76, 43, 31, 0.72) !important;
          box-shadow:
            0 0 0 3px rgba(253, 230, 138, 0.11),
            0 18px 40px rgba(0, 0, 0, 0.24),
            0 0 30px rgba(251, 191, 36, 0.18);
        }

        .avatar-choice-active .avatar-choice-portrait {
          border-color: rgba(253, 230, 138, 0.7);
          box-shadow:
            0 0 0 5px rgba(253, 230, 138, 0.1),
            0 16px 30px rgba(0, 0, 0, 0.24);
        }

        .identity-form {
          display: grid;
          gap: 9px;
        }

        .identity-form label {
          color: var(--cho-neo-text-accent);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          line-height: 1.35;
          text-transform: none;
        }

        .identity-form input {
          min-height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          padding: 0 14px;
          color: var(--cho-neo-text-primary);
          background: rgba(8, 13, 28, 0.62);
          font: inherit;
          outline: none;
        }

        .identity-form input:focus {
          border-color: rgba(253, 230, 138, 0.66);
          box-shadow: 0 0 0 3px rgba(253, 230, 138, 0.12);
        }

        .identity-form > p {
          margin: 0;
          color: #fecdd3;
          font-size: 13px;
          font-weight: 600;
        }

        .identity-form div {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .identity-form div button {
          padding: 0 14px;
        }

        .room-scene {
          position: relative;
          overflow: hidden;
          min-height: 720px;
          margin-top: 14px;
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

        .room-scene:not(.room-scene-focused) {
          min-height: auto;
          overflow: visible;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
        }

        .room-scene:not(.room-scene-focused)::before,
        .room-scene:not(.room-scene-focused)::after {
          display: none;
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
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .counter strong span {
          display: block;
          margin-top: 2px;
          font-size: 0.78em;
          opacity: 0.68;
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
          content: "Bấm vào đâu cũng vào bàn được\\A Tap anywhere to enter";
          display: block;
          margin-top: 12px;
          color: rgba(253, 230, 138, 0.76);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
          white-space: pre-line;
        }

        .room-scene:not(.room-scene-focused) .counter {
          display: none;
        }

        .gossip-image-lobby {
          position: relative;
          z-index: 4;
        }

        .gossip-room-stage {
          position: relative;
          width: min(1120px, 100%);
          aspect-ratio: 16 / 9;
          margin: 0 auto;
          overflow: hidden;
          border: 1px solid rgba(253, 230, 138, 0.24);
          border-radius: 36px;
          background: rgba(8, 13, 28, 0.82);
          box-shadow:
            0 34px 92px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        .room-scene-entered .gossip-room-stage {
          animation: quanTamRoomFadeIn 700ms ease both;
        }

        .gossip-room-stage::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          background:
            radial-gradient(circle at 28% 38%, rgba(253, 230, 138, 0.28), transparent 18%),
            radial-gradient(circle at 72% 40%, rgba(251, 191, 36, 0.2), transparent 21%),
            radial-gradient(circle at 50% 70%, rgba(253, 230, 138, 0.14), transparent 25%);
          opacity: 0;
        }

        .room-scene-entered .gossip-room-stage::after {
          animation: quanTamCounterGlow 2500ms ease-out both;
        }

        .gossip-room-image,
        .gossip-room-scrim {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .gossip-room-image {
          object-fit: cover;
          object-position: center;
        }

        .gossip-room-scrim {
          pointer-events: none;
          background:
            radial-gradient(circle at 26% 35%, rgba(253, 230, 138, 0.13), transparent 20%),
            radial-gradient(circle at 72% 43%, rgba(251, 191, 36, 0.11), transparent 24%),
            radial-gradient(circle at 50% 50%, transparent 0 44%, rgba(7, 10, 24, 0.1) 76%),
            linear-gradient(180deg, rgba(253, 230, 138, 0.035), rgba(7, 10, 24, 0.16));
        }

        .room-scene:not(.room-scene-settled) .hotspot-label {
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, calc(-50% + 8px));
        }

        .room-scene-settled .hotspot-label {
          opacity: 1;
          transition:
            opacity 420ms ease,
            transform 420ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .gossip-hotspot-layer {
          position: absolute;
          z-index: 10;
          inset: 0;
        }

        .gossip-image-lobby .table-hotspot {
          position: absolute;
          width: 188px;
          min-height: 118px;
          cursor: pointer;
          outline: none;
          transform: translateZ(0);
          transition: filter 160ms ease, transform 160ms ease;
        }

        .gossip-hotspot-layer:has(.table-hotspot:hover) .table-hotspot:not(:hover) .hotspot-label,
        .gossip-hotspot-layer:has(.table-hotspot:focus) .table-hotspot:not(:focus) .hotspot-label,
        .gossip-hotspot-layer:has(.table-hotspot:focus-visible) .table-hotspot:not(:focus-visible) .hotspot-label {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }

        .gossip-image-lobby .table-hotspot:hover,
        .gossip-image-lobby .table-hotspot:focus,
        .gossip-image-lobby .table-hotspot:focus-visible {
          z-index: 4;
          filter: drop-shadow(0 18px 34px rgba(0, 0, 0, 0.42));
          transform: translateY(-3px);
        }

        .gossip-image-lobby .table-hotspot:hover .hotspot-glow,
        .gossip-image-lobby .table-hotspot:focus .hotspot-glow,
        .gossip-image-lobby .table-hotspot:focus-visible .hotspot-glow {
          opacity: 0.96;
          transform: translate(-50%, -50%) scale(1.32);
        }

        .gossip-image-lobby .table-hotspot:hover .hotspot-label,
        .gossip-image-lobby .table-hotspot:focus .hotspot-label,
        .gossip-image-lobby .table-hotspot:focus-visible .hotspot-label {
          border-color: rgba(253, 230, 138, 0.5);
          background:
            radial-gradient(circle at 18% 0%, rgba(253, 230, 138, 0.18), transparent 30%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.13), rgba(255, 247, 237, 0.05)),
            rgba(37, 22, 24, 0.58);
          box-shadow:
            0 10px 26px rgba(0, 0, 0, 0.3),
            0 0 24px rgba(251, 191, 36, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          transform: translate(-50%, -50%) scale(0.94);
        }

        @media (hover: hover) and (pointer: fine) {
          .gossip-image-lobby .hotspot-label {
            opacity: 0;
            pointer-events: none;
            transform: translate(-50%, -50%) scale(0.72);
          }

          .gossip-hotspot-layer:has(.table-hotspot:hover) .table-hotspot:not(:hover) .hotspot-label,
          .gossip-hotspot-layer:has(.table-hotspot:focus) .table-hotspot:not(:focus) .hotspot-label,
          .gossip-hotspot-layer:has(.table-hotspot:focus-visible) .table-hotspot:not(:focus-visible) .hotspot-label {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.72);
          }

          .gossip-image-lobby .table-hotspot:hover .hotspot-label,
          .gossip-image-lobby .table-hotspot:focus .hotspot-label,
          .gossip-image-lobby .table-hotspot:focus-visible .hotspot-label {
            opacity: 1 !important;
            pointer-events: auto;
            transform: translate(-50%, -50%) scale(0.94) !important;
          }
        }

        .gossip-image-lobby .table-hotspot:focus-visible {
          border-radius: 24px;
          outline: 3px solid rgba(253, 230, 138, 0.9);
          outline-offset: 6px;
        }

        .table-hotspot-1 { left: 18%; top: 26%; }
        .table-hotspot-2 { left: 42%; top: 45%; }
        .table-hotspot-3 { right: 15%; top: 27%; }
        .table-hotspot-4 { left: 15%; top: 62%; }
        .table-hotspot-5 { right: 16%; top: 62%; }

        .hotspot-glow {
          position: absolute;
          left: 50%;
          top: 50%;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(253, 230, 138, 0.48);
          background:
            radial-gradient(circle at 35% 28%, rgba(255, 247, 237, 0.35), transparent 22%),
            linear-gradient(180deg, rgba(253, 230, 138, 0.34), rgba(146, 64, 14, 0.34)),
            rgba(37, 22, 24, 0.78);
          color: var(--cho-neo-text-accent);
          box-shadow:
            0 0 0 8px rgba(253, 230, 138, 0.1),
            0 0 28px rgba(251, 191, 36, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
          opacity: 0.86;
          pointer-events: none;
          transition:
            opacity 180ms ease,
            transform 180ms ease;
        }

        .hotspot-glow::after {
          content: "";
          font-size: 18px;
          line-height: 1;
          filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.3));
        }

        .table-hotspot-1 .hotspot-glow::after { content: "☕"; }
        .table-hotspot-2 .hotspot-glow::after { content: "▤"; }
        .table-hotspot-3 .hotspot-glow::after { content: "◒"; }
        .table-hotspot-4 .hotspot-glow::after { content: "🍵"; }
        .table-hotspot-5 .hotspot-glow::after { content: "◌"; }

        .hotspot-label {
          position: absolute;
          left: 50%;
          top: 50%;
          display: grid;
          width: 184px;
          gap: 7px;
          padding: 10px;
          border: 1px solid rgba(253, 230, 138, 0.3);
          border-radius: 18px;
          background:
            radial-gradient(circle at 18% 0%, rgba(253, 230, 138, 0.16), transparent 30%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.16), rgba(255, 247, 237, 0.065)),
            rgba(37, 22, 24, 0.7);
          color: var(--cho-neo-text-primary);
          box-shadow:
            0 14px 30px rgba(0, 0, 0, 0.3),
            0 0 22px rgba(251, 191, 36, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          transform: translate(-50%, -50%);
          backdrop-filter: blur(12px);
          transition:
            opacity 180ms ease,
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .hotspot-label p,
        .hotspot-label strong {
          margin: 0;
        }

        .hotspot-label p {
          color: var(--cho-neo-text-accent);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.05;
        }

        .hotspot-label p span,
        .hotspot-label button span {
          display: block;
        }

        .hotspot-label p span {
          margin-top: 2px;
          color: rgba(92, 45, 24, 0.68);
          font-size: 10px;
        }

        .hotspot-label strong {
          color: rgba(255, 247, 237, 0.74);
          font-size: 10px;
          font-weight: 600;
          line-height: 1.25;
        }

        .hotspot-label button {
          min-height: 32px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(180deg, #fde68a, #fbbf24);
          color: #111827;
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
        }

        .hotspot-label button span {
          font-size: 0.82em;
          opacity: 0.72;
        }

        @keyframes quanTamRoomFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes quanTamCounterGlow {
          0% {
            opacity: 0;
          }
          24% {
            opacity: 0.9;
          }
          100% {
            opacity: 0.32;
          }
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

        .cafe-page:has(.detail-panel-front-counter) {
          background:
            radial-gradient(circle at 50% 38%, rgba(214, 116, 86, 0.18), transparent 34%),
            linear-gradient(180deg, #140a0a, #0e090b 72%);
        }

        .cafe-page:has(.table-detail) .floor-grid,
        .cafe-page:has(.table-detail) .cafe-hero,
        .cafe-page:has(.table-detail) .cafe-stage-controls,
        .room-scene-focused::before,
        .room-scene-focused::after,
        .room-scene-focused .counter {
          display: none;
        }

        .cafe-page:has(.detail-panel-trend-table) .floor-grid,
        .cafe-page:has(.detail-panel-trend-table) .cafe-hero,
        .room-scene-focused:has(.detail-panel-trend-table)::before,
        .room-scene-focused:has(.detail-panel-trend-table)::after,
        .room-scene-focused:has(.detail-panel-trend-table) .counter {
          display: none;
        }

        .cafe-page:has(.table-detail) .cafe-hero {
          position: absolute;
          top: 14px;
          right: 16px;
          z-index: 90;
          display: flex;
          padding: 0;
        }

        .cafe-page:has(.table-detail) .cafe-hero > div:first-child {
          display: none;
        }

        .cafe-page:has(.table-detail) .cafe-hero-actions {
          gap: 10px;
        }

        .cafe-page:has(.detail-panel-front-counter) .cafe-shell {
          padding: clamp(10px, 2vw, 18px);
        }

        .room-scene-focused:has(.detail-panel-front-counter) {
          min-height: auto;
          padding: 0;
          border: 0;
          background:
            radial-gradient(circle at 50% 48%, rgba(213, 126, 98, 0.15), transparent 34%),
            rgba(18, 10, 10, 0.56);
          box-shadow: none;
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
          border: 1px solid var(--room-pass2-border);
          border-radius: 30px;
          background:
            linear-gradient(180deg, rgba(247, 238, 232, 0.13), rgba(247, 238, 232, 0.055)),
            var(--room-pass2-surface-soft);
          box-shadow:
            0 22px 70px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(14px);
        }

        .detail-panel-front-counter {
          overflow: visible;
          padding: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
        }

        .detail-panel-trend-table {
          display: flex;
          flex-direction: column;
          padding: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
        }

        .detail-panel-local-table {
          padding: clamp(18px, 3vw, 28px);
          border-color: var(--room-pass2-border-soft);
          background:
            radial-gradient(circle at 16% 0%, rgba(217, 141, 126, 0.14), transparent 30%),
            linear-gradient(180deg, rgba(247, 238, 232, 0.12), rgba(247, 238, 232, 0.055)),
            var(--room-pass2-surface);
        }

        .compact-table-header {
          order: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          margin: 0 0 12px;
        }

        .compact-table-back {
          min-height: 32px;
          padding: 5px 10px;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 999px;
          color: var(--room-pass2-text-primary);
          background: var(--room-pass2-control);
          font-size: 12px;
          font-weight: 600;
        }

        .compact-table-enter {
          flex: 0 0 auto;
          min-height: 32px;
          padding: 5px 10px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.05;
        }

        .compact-table-enter span {
          display: block;
          margin-top: 1px;
          font-size: 9px;
          font-weight: 600;
          opacity: 0.7;
        }

        .compact-table-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          max-width: 58%;
          margin-left: auto;
          padding: 5px 10px;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 999px;
          color: var(--cho-neo-text-accent);
          background: rgba(107, 55, 47, 0.5);
          font-size: 12px;
          font-weight: 600;
          line-height: 1.1;
          text-align: right;
          white-space: nowrap;
        }

        .front-counter-quick-controls {
          order: 1;
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          margin: 0 0 8px;
          overflow: visible;
        }

        .front-counter-control-group {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .front-counter-action-group {
          flex: 0 1 auto;
          justify-content: flex-end;
        }

        .front-counter-quick-controls .compact-table-back,
        .front-counter-seat-control,
        .front-counter-count-control,
        .front-counter-quick-controls :global(.cho-neo-feedback-button),
        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle) {
          flex: 0 0 auto;
          height: 44px;
          min-height: 44px;
          border: 1px solid var(--room-pass2-border);
          border-radius: 12px;
          color: var(--room-pass2-text-primary);
          background: var(--room-pass2-control);
          font: inherit;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: 0;
          box-shadow:
            0 8px 20px rgba(18, 10, 8, 0.18),
            inset 0 1px 0 rgba(255, 247, 237, 0.08);
          transition:
            border-color 160ms ease,
            background 160ms ease,
            box-shadow 160ms ease,
            color 160ms ease,
            transform 160ms ease;
        }

        .front-counter-quick-controls .compact-table-back,
        .front-counter-seat-control,
        .front-counter-count-control,
        .front-counter-quick-controls :global(.cho-neo-feedback-button),
        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle) {
          padding: 0 12px;
        }

        .front-counter-seat-control {
          color: var(--cho-neo-text-primary);
          background: rgba(111, 56, 47, 0.58);
        }

        .front-counter-seat-control-seated {
          color: #f7d594;
          border-color: rgba(247, 213, 148, 0.38);
          background: rgba(94, 40, 46, 0.42);
        }

        .front-counter-back-control,
        .front-counter-count-control,
        .front-counter-topic-note,
        .front-counter-theme-audio {
          flex: 0 0 auto;
          white-space: nowrap;
        }

        .front-counter-theme-audio {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: auto;
          min-width: 0;
          height: 44px;
        }

        .front-counter-count-control {
          color: var(--room-pass2-text-secondary);
          font-size: 11px;
          font-weight: 500;
          box-shadow: none;
        }

        .front-counter-seat-control span {
          display: none;
        }

        .front-counter-quick-controls :global(.cho-neo-feedback-button) {
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: auto;
          min-width: 0;
          box-shadow: none;
          font-size: 11px;
          line-height: 1;
          text-shadow: none;
        }

        .front-counter-quick-controls :global(.cho-neo-feedback-button)::before {
          content: "♡";
          color: #efb8aa;
          font-size: 13px;
          line-height: 1;
        }

        .front-counter-quick-controls :global(.cho-neo-feedback-button span) {
          display: inline;
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
        }

        .front-counter-quick-controls :global(.cho-neo-feedback-button small) {
          display: none;
        }

        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio) {
          flex: 0 0 auto;
          width: auto;
          min-width: 0;
          height: 44px;
          min-height: 44px;
          border-radius: 12px;
          padding: 0;
          background: transparent;
          box-shadow: none;
        }

        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-audio-controls) {
          width: auto;
          height: 100%;
        }

        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: auto;
          min-width: 78px;
          box-shadow: none;
          line-height: 1;
          text-shadow: none;
        }

        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle)::after {
          content: "Nhạc";
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
        }

        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle span) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 12px;
          font-size: 14px;
          line-height: 1;
        }

        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle[aria-pressed="true"]) {
          color: var(--cho-neo-text-accent);
          text-shadow: none;
        }

        .front-counter-quick-controls .compact-table-back:hover,
        .front-counter-seat-control:hover,
        .front-counter-quick-controls :global(.cho-neo-feedback-button:hover),
        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle:hover) {
          border-color: rgba(246, 207, 131, 0.42);
          background: rgba(92, 45, 24, 0.62);
          color: var(--cho-neo-text-primary);
        }

        .front-counter-quick-controls .compact-table-back:focus-visible,
        .front-counter-seat-control:focus-visible,
        .front-counter-count-control:focus-visible,
        .front-counter-quick-controls :global(.cho-neo-feedback-button:focus-visible),
        .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle:focus-visible) {
          outline: 2px solid rgba(246, 207, 131, 0.82);
          outline-offset: 2px;
        }

        .detail-panel-trend-table .compact-table-header {
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          margin-bottom: 12px;
        }

        .detail-panel-trend-table .compact-table-back,
        .detail-panel-trend-table .compact-table-enter,
        .detail-panel-trend-table .compact-table-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 7px 12px;
          border: 1px solid rgba(146, 64, 14, 0.14);
          border-radius: 14px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.12;
          letter-spacing: 0;
          box-shadow:
            0 8px 20px rgba(69, 26, 3, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.54);
        }

        .detail-panel-trend-table .compact-table-back {
          color: #6f4b3b;
          background: rgba(255, 255, 255, 0.68);
        }

        .detail-panel-trend-table .compact-table-enter {
          flex-direction: column;
          color: var(--cho-neo-text-primary);
          border-color: rgba(190, 24, 93, 0.22);
          background: #f87171;
          box-shadow: 0 8px 18px rgba(190, 24, 93, 0.16);
        }

        .detail-panel-trend-table .compact-table-enter span {
          display: block;
          margin-top: 1px;
          font-size: 10px;
          font-weight: 500;
          opacity: 0.86;
        }

        .detail-panel-trend-table .compact-table-count {
          margin-left: auto;
          color: #7d4f40;
          background: rgba(255, 255, 255, 0.58);
          text-align: center;
        }

        .detail-panel-trend-table .detail-heading {
          order: 2;
        }

        .detail-panel-trend-table .detail-heading p {
          display: none;
        }

        .detail-panel-trend-table .detail-heading h2 {
          color: #8f153f;
          font-size: clamp(28px, 3.7vw, 44px);
          font-weight: 500;
          line-height: 0.98;
          letter-spacing: -0.015em;
        }

        .detail-panel-trend-table .detail-heading h2 span {
          margin-top: 4px;
          color: #7d4f40;
          font-size: 0.36em;
          font-weight: 400;
        }

        .detail-panel-trend-table .trend-table-subtitle {
          order: 3;
          color: #6f4b3b;
        }

        .detail-panel-trend-table .trend-table-subtitle span {
          color: #8a6858;
        }

        .detail-panel-trend-table .detail-members {
          display: none;
        }

        .detail-panel-trend-table .trend-table-scene {
          order: 4;
        }

        .detail-panel-trend-table .mock-thread {
          order: 5;
        }

        .detail-panel-trend-table .table-note-form {
          order: 6;
        }

        .detail-panel-front-counter .detail-heading {
          display: none;
        }

        .detail-panel-front-counter .topic,
        .detail-panel-front-counter .detail-members {
          display: none;
        }

        .table-detail:has(.detail-panel-front-counter) {
          width: min(1160px, 100%);
          max-width: 100%;
          margin-top: 0;
        }

        .table-detail:has(.detail-panel-front-counter) > .table-glow,
        .table-detail:has(.detail-panel-front-counter) > .detail-table-plate {
          display: none;
        }

        .detail-panel-shop-talk .front-counter-quick-controls {
          margin-bottom: 8px;
        }

        .table-detail:has(.detail-panel-trend-table) {
          width: min(980px, 100%);
          margin-top: 0;
          padding: clamp(18px, 3vw, 28px);
          border: 1px solid rgba(146, 64, 14, 0.1);
          border-radius: 30px;
          background: linear-gradient(180deg, #f1e6dc 0%, #f8efe8 46%, #efe3d9 100%);
          box-shadow:
            0 18px 48px rgba(69, 26, 3, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .table-detail:has(.detail-panel-trend-table) > .table-glow,
        .table-detail:has(.detail-panel-trend-table) > .detail-table-plate {
          display: none;
        }

        .table-detail:has(.detail-panel-local-table) {
          width: min(980px, 100%);
          margin-top: 0;
        }

        .table-detail:has(.detail-panel-local-table) > .table-glow,
        .table-detail:has(.detail-panel-local-table) > .detail-table-plate {
          display: none;
        }

        .detail-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .detail-heading p {
          margin: 0 0 8px;
          color: var(--cho-neo-text-accent);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .detail-heading p span,
        .table-heading p span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 10px;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .detail-heading h2 {
          margin: 0;
          font-size: clamp(36px, 5vw, 62px);
          line-height: 0.9;
          letter-spacing: -0.045em;
        }

        .detail-heading h2 span,
        .table-heading h2 span {
          display: block;
          margin-top: 5px;
          color: rgba(255, 247, 237, 0.66);
          font-size: 0.34em;
          line-height: 1.1;
          letter-spacing: 0;
        }

        .detail-heading strong {
          flex: 0 0 auto;
          padding: 8px 11px;
          border-radius: 999px;
          color: #111827;
          background: rgba(253, 230, 138, 0.92);
          font-size: 12px;
          font-weight: 600;
        }

        .detail-heading strong span,
        .table-footer strong span {
          display: block;
          margin-top: 2px;
          font-size: 10px;
          font-weight: 600;
          opacity: 0.68;
        }

        .trend-table-subtitle {
          max-width: 620px;
          margin: 8px 0 0;
          color: rgba(255, 247, 237, 0.64);
          font-size: clamp(12px, 1.35vw, 14px);
          font-weight: 400;
          line-height: 1.45;
        }

        .trend-table-subtitle span {
          display: block;
          margin-top: 4px;
          color: rgba(255, 247, 237, 0.5);
          font-size: 11px;
          font-weight: 400;
        }

        .detail-members {
          margin-top: 18px;
        }

        .generic-table-artwork {
          overflow: hidden;
          margin: 16px 0 18px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 22px;
          background: rgba(67, 20, 7, 0.38);
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
        }

        .generic-table-artwork img {
          display: block;
          width: 100%;
          height: clamp(210px, 30vw, 340px);
          object-fit: cover;
          object-position: center;
        }

        .local-table-stage {
          display: grid;
          gap: 14px;
          margin-top: 14px;
        }

        .local-table-heading {
          display: block;
        }

        .local-table-heading p {
          margin: 0 0 8px;
          color: var(--cho-neo-text-accent);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .local-table-heading p span {
          display: block;
          margin-top: 3px;
          color: var(--room-pass2-text-muted);
          font-size: 9px;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .local-table-heading h2 {
          margin: 0;
          color: var(--cho-neo-text-primary);
          font-size: clamp(34px, 5vw, 58px);
          line-height: 0.94;
        }

        .local-table-heading h2 span {
          display: block;
          margin-top: 5px;
          color: var(--room-pass2-text-secondary);
          font-size: 0.34em;
          line-height: 1.1;
        }

        .local-table-subtitle {
          max-width: 760px;
          margin: -4px 0 0;
          color: var(--room-pass2-text-secondary);
          font-size: clamp(14px, 1.8vw, 17px);
          font-weight: 600;
          line-height: 1.42;
        }

        .local-table-subtitle span {
          display: block;
          margin-top: 5px;
          color: var(--room-pass2-text-muted);
          font-size: 12px;
          font-weight: 600;
        }

        .local-table-artwork {
          overflow: hidden;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 26px;
          background:
            radial-gradient(circle at 50% 0%, rgba(253, 230, 138, 0.12), transparent 34%),
            rgba(67, 20, 7, 0.34);
          box-shadow:
            0 20px 48px rgba(0, 0, 0, 0.26),
            inset 0 1px 0 rgba(255, 247, 237, 0.08);
        }

        .local-table-artwork img {
          display: block;
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          object-position: center;
        }

        .local-table-prompts,
        .local-table-thread,
        .local-table-rules {
          border: 1px solid rgba(146, 64, 14, 0.14);
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.94), rgba(254, 243, 199, 0.84));
          box-shadow: 0 14px 32px rgba(69, 26, 3, 0.12);
        }

        .local-table-prompts {
          display: grid;
          gap: 10px;
          padding: 12px;
        }

        .local-table-prompts > div:first-child {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
        }

        .local-table-prompts strong,
        .local-table-thread-heading strong,
        .local-table-empty-state strong {
          color: #7c2d12;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.15;
        }

        .local-table-prompts strong span,
        .local-table-thread-heading strong span,
        .local-table-empty-state strong span {
          display: block;
          margin-top: 3px;
          color: rgba(92, 45, 24, 0.58);
          font-size: 10px;
          font-weight: 600;
        }

        .local-table-prompts small {
          color: rgba(92, 45, 24, 0.58);
          font-size: 10px;
          font-weight: 600;
          text-align: right;
        }

        .local-table-chip-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none;
        }

        .local-table-chip-row::-webkit-scrollbar {
          display: none;
        }

        .local-table-chip {
          display: grid;
          grid-template-columns: 14px max-content;
          gap: 7px;
          align-items: center;
          flex: 0 0 auto;
          min-height: 36px;
          border: 1px solid rgba(146, 64, 14, 0.14);
          border-radius: 999px;
          padding: 7px 11px;
          color: #5c2d18;
          background: rgba(255, 255, 255, 0.62);
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .local-table-chip > span {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          box-shadow: 0 0 0 2px rgba(146, 64, 14, 0.1);
        }

        .local-table-chip small {
          display: none;
        }

        .local-table-chip:hover,
        .local-table-chip:focus-visible {
          outline: none;
          border-color: rgba(253, 230, 138, 0.42);
          background: rgba(253, 230, 138, 0.38);
        }

        .local-table-thread {
          display: grid;
          gap: 10px;
          padding: 13px;
        }

        .local-table-thread-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .local-table-note {
          padding: 11px 12px;
          border: 1px solid rgba(146, 64, 14, 0.12);
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(255, 247, 237, 0.56)),
            rgba(254, 243, 199, 0.52);
        }

        .local-table-note small {
          display: block;
          color: rgba(124, 45, 18, 0.68);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .post-author-chip {
          display: inline-flex;
          max-width: 100%;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .post-author-chip img,
        .post-author-chip > span {
          width: 30px;
          height: 30px;
          flex: 0 0 auto;
          border-radius: 999px;
        }

        .post-author-chip img {
          object-fit: cover;
        }

        .post-author-chip > span {
          display: grid;
          place-items: center;
          border: 1px solid rgba(146, 64, 14, 0.14);
          color: #7c2d12;
          background: rgba(253, 230, 138, 0.32);
          font-size: 11px;
          font-weight: 600;
        }

        .post-author-chip strong {
          display: block;
          overflow: hidden;
          color: #4a2416;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.1;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .post-author-chip small {
          display: block;
          margin-top: 3px;
          color: rgba(92, 45, 24, 0.56);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0;
          line-height: 1.1;
        }

        .local-table-note p {
          margin: 5px 0 0;
          color: #3f2418;
          font-size: 14px;
          line-height: 1.42;
        }

        .local-table-empty-state {
          padding: 12px;
          border: 1px dashed rgba(146, 64, 14, 0.18);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.46);
        }

        .local-table-empty-state p {
          margin: 7px 0 0;
          color: rgba(92, 45, 24, 0.68);
          font-size: 12px;
          font-weight: 600;
          line-height: 1.36;
        }

        .local-table-form {
          margin-top: 0;
          border-color: rgba(146, 64, 14, 0.16);
          background:
            radial-gradient(circle at 10% 0%, rgba(253, 230, 138, 0.24), transparent 30%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.96), rgba(254, 243, 199, 0.88));
        }

        .local-table-rules {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 12px;
        }

        .local-table-rules p {
          margin: 0;
          color: rgba(63, 36, 24, 0.82);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.28;
        }

        .local-table-rules p span {
          display: block;
          margin-top: 3px;
          color: rgba(92, 45, 24, 0.52);
          font-size: 9px;
          font-weight: 600;
        }

        .local-table-stage-vent-table {
          --local-table-accent: #fb923c;
        }

        .local-table-stage-quiet-table {
          --local-table-accent: #2dd4bf;
        }

        .trend-table-scene {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .trend-table-stage {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1672 / 941;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 24px;
          background:
            radial-gradient(circle at 50% 72%, rgba(244, 114, 182, 0.1), transparent 42%),
            linear-gradient(135deg, #1b1111, #2b1815 58%, #120c0d);
          box-shadow:
            0 18px 42px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 247, 237, 0.08);
        }

        .trend-table-stage img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          filter: saturate(1.02) brightness(1.01);
        }

        .trend-table-stage::after {
          content: "";
          position: absolute;
          inset: -24% -58%;
          z-index: 1;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(
            112deg,
            transparent 0%,
            transparent 28%,
            rgba(255, 235, 190, 0.05) 35%,
            rgba(255, 228, 170, 0.56) 45%,
            rgba(255, 248, 220, 0.72) 50%,
            rgba(255, 208, 138, 0.34) 58%,
            transparent 70%,
            transparent 100%
          );
          filter: blur(12px);
          transform: translate3d(-42%, 0, 0);
          animation: trendTableSunrayDrift 18s ease-in-out infinite;
          will-change: opacity, transform;
        }

        .trend-table-hero-dots {
          display: flex;
          justify-content: center;
          gap: 5px;
        }

        .trend-table-hero-dots span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.32);
        }

        .trend-table-hero-dots span:first-child {
          width: 18px;
          background: rgba(244, 114, 182, 0.74);
        }

        .trend-table-topic-chips {
          display: grid;
          gap: 9px;
          margin-top: 8px;
          padding: 14px;
          border: 1px solid rgba(146, 64, 14, 0.08);
          border-radius: 16px 16px 8px 8px;
          background: #f6efe7;
          box-shadow: none;
        }

        .trend-table-topic-chips > div:first-child {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .trend-table-topic-chips strong {
          color: #8f153f;
          font-size: 12px;
          font-weight: 600;
        }

        .trend-table-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .trend-table-topic-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 34px;
          min-width: 0;
          border: 1px solid rgba(146, 64, 14, 0.1);
          border-radius: 999px;
          padding: 6px 10px;
          color: #2f1b13;
          background: rgba(255, 255, 255, 0.76);
          font: inherit;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.12;
          text-align: left;
          cursor: pointer;
          box-shadow: none;
        }

        .trend-table-topic-chip > span {
          flex: 0 0 auto;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
        }

        .trend-table-topic-chip:hover,
        .trend-table-topic-chip:focus-visible {
          outline: none;
          border-color: rgba(244, 114, 105, 0.34);
          background: rgba(255, 246, 243, 0.92);
        }

        .trend-chip-marigold > span {
          background: #f59e0b;
        }

        .trend-chip-sky > span {
          background: #38bdf8;
        }

        .trend-chip-coral > span {
          background: #fb5a5f;
        }

        .trend-chip-magenta > span {
          background: #ec4899;
        }

        .trend-chip-orange > span {
          background: #fb923c;
        }

        .trend-chip-turquoise > span {
          background: #2dd4bf;
        }

        .trend-chip-green > span {
          background: #86efac;
        }

        .trend-chip-purple > span {
          background: #8b5cf6;
        }

        .trend-chip-lavender > span {
          background: #c4b5fd;
        }

        .trend-table-empty-state {
          width: min(100%, 620px);
          padding: 16px;
          border: 1px dashed rgba(253, 230, 138, 0.26);
          border-radius: 20px;
          background:
            radial-gradient(circle at 12% 0%, rgba(253, 230, 138, 0.12), transparent 36%),
            rgba(255, 247, 237, 0.06);
        }

        .trend-table-empty-state strong,
        .trend-table-empty-state span {
          display: block;
        }

        .trend-table-empty-state strong {
          color: var(--cho-neo-text-accent);
          font-size: 15px;
          font-weight: 600;
        }

        .trend-table-empty-state p {
          margin: 8px 0 0;
          color: rgba(255, 247, 237, 0.74);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.45;
        }

        .trend-table-empty-state span {
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.52);
          font-size: 11px;
        }

        .trend-table-thread {
          margin-top: 8px;
          padding: 14px;
          border: 1px solid rgba(146, 64, 14, 0.08);
          border-radius: 8px;
          background: #fbf6ef;
          box-shadow: none;
        }

        .trend-table-thread-heading strong,
        .trend-table-thread-heading span {
          display: block;
        }

        .trend-table-thread-heading strong {
          color: #8f153f;
          font-size: 13px;
          font-weight: 600;
        }

        .trend-table-starter-list {
          display: grid;
          gap: 8px;
          padding: 8px 0 0;
          border: 0;
          border-radius: 0;
          background: transparent;
        }

        .trend-table-starter-list strong,
        .trend-table-starter-list strong span {
          display: block;
        }

        .trend-table-starter-list strong {
          color: #2f1b13;
          font-size: 13px;
          font-weight: 600;
        }

        .trend-table-empty-copy strong,
        .trend-table-empty-copy p {
          display: block;
        }

        .trend-table-empty-copy p {
          margin: 4px 0 0;
          color: #6f4b3b;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.34;
        }

        .trend-table-starter-list > div {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .trend-table-starter-list > .trend-table-empty-copy {
          display: block;
        }

        .trend-table-starter-list button {
          min-height: 32px;
          padding: 6px 10px;
          border: 1px solid rgba(146, 64, 14, 0.07);
          border-radius: 999px;
          color: #3b2318;
          background: rgba(255, 255, 255, 0.7);
          font: inherit;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.12;
          text-align: left;
          cursor: pointer;
        }

        .trend-table-starter-list button:hover,
        .trend-table-starter-list button:focus-visible {
          outline: none;
          border-color: rgba(244, 114, 105, 0.28);
          background: rgba(255, 241, 242, 0.84);
        }

        .detail-panel-trend-table .thread-message {
          border-color: rgba(146, 64, 14, 0.08);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: none;
        }

        .detail-panel-trend-table .thread-message small {
          color: #7d4f40;
          font-size: 10px;
          font-weight: 550;
        }

        .detail-panel-trend-table .thread-message p {
          color: #2f1b13;
          font-size: 14px;
          font-weight: 450;
          line-height: 1.48;
        }

        .detail-panel-trend-table .trend-table-report-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 28px;
          border-radius: 10px;
          color: #6f3d2f;
          background: transparent;
          font-weight: 550;
        }

        .detail-panel-trend-table .trend-table-report-action svg {
          width: 14px;
          height: 14px;
        }

        .detail-panel-trend-table .table-note-form {
          gap: 8px;
          margin-top: 8px;
          padding: 12px;
          border-color: rgba(146, 64, 14, 0.08);
          border-radius: 8px 8px 16px 16px;
          background: #f7eee9;
          box-shadow: none;
        }

        .detail-panel-trend-table .table-note-form label {
          color: #8f153f;
          font-size: 12px;
          font-weight: 600;
        }

        .detail-panel-trend-table .table-safety-line {
          order: 3;
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          color: #6f4b3b;
          font-size: 11px;
          font-weight: 550;
        }

        .detail-panel-trend-table .table-safety-line::before {
          content: "";
          flex: 0 0 auto;
          width: 11px;
          height: 11px;
          border: 1.4px solid currentColor;
          border-radius: 70% 30% 70% 30%;
          transform: rotate(-28deg);
          opacity: 0.68;
        }

        .detail-panel-trend-table .table-note-form .avatar-chip {
          order: 1;
        }

        .detail-panel-trend-table .message-row {
          order: 2;
        }

        .detail-panel-trend-table .message-row input {
          border-color: rgba(146, 64, 14, 0.16);
          border-radius: 16px;
          color: #2f1b13;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .detail-panel-trend-table .message-row input::placeholder {
          color: #8a6858;
          opacity: 1;
        }

        .detail-panel-trend-table .composer-avatar-passport {
          color: #2f1b13;
        }

        .detail-panel-trend-table .composer-avatar-passport strong {
          color: #2f1b13;
          font-weight: 600;
        }

        .detail-panel-trend-table .composer-avatar-passport small {
          color: #7d4f40;
          font-weight: 550;
        }

        .detail-panel-trend-table .composer-avatar-action {
          color: #7f1d3f;
          font-weight: 600;
        }

        .detail-panel-trend-table .post-feedback {
          color: #7a3d2d;
          font-weight: 600;
        }

        .detail-panel-trend-table .character-count {
          color: #6f4b3b;
          font-weight: 600;
        }

        .detail-panel-trend-table .character-count span {
          color: #7d5a49;
          font-weight: 550;
        }

        .detail-panel-trend-table .message-row button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          min-width: 48px;
          min-height: 48px;
          padding: 0;
          border-radius: 16px;
          color: var(--cho-neo-text-primary);
          background: #f87171;
          font-size: 18px;
          line-height: 1;
          box-shadow: 0 8px 18px rgba(190, 24, 93, 0.16);
        }

        .detail-panel-trend-table .message-row button svg {
          width: 20px;
          height: 20px;
        }

        .detail-panel-trend-table .message-row button:disabled {
          color: #7d5a49;
          background: rgba(255, 255, 255, 0.7);
          box-shadow: none;
        }

        .detail-panel-trend-table .table-light-rules {
          border-color: rgba(190, 24, 93, 0.1);
          background: rgba(255, 247, 237, 0.62);
          box-shadow: none;
        }

        .detail-panel-trend-table .table-light-rules summary {
          color: #8f153f;
        }

        .detail-panel-trend-table .leave-button {
          justify-self: start;
          min-height: 32px;
          margin-top: 12px;
          border: 1px solid rgba(190, 24, 93, 0.12);
          padding: 0 12px;
          color: #7c2d12;
          background: rgba(255, 247, 237, 0.62);
          font-size: 11px;
          box-shadow: none;
        }

        .trend-table-rules {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
          padding: 12px;
          border: 1px solid rgba(253, 230, 138, 0.14);
          border-radius: 22px;
          background: rgba(255, 247, 237, 0.045);
        }

        .trend-table-rules p {
          margin: 0;
          color: rgba(255, 247, 237, 0.82);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.25;
        }

        .trend-table-rules p span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.52);
          font-size: 9px;
          font-weight: 600;
        }

        .front-counter-table-scene {
          position: relative;
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 30px;
          background: transparent;
          box-shadow: none;
        }

        .front-counter-table-surface {
          position: relative;
          min-height: 230px;
          overflow: hidden;
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 999px / 58%;
          background:
            radial-gradient(ellipse at 50% 42%, rgba(253, 230, 138, 0.18), transparent 42%),
            linear-gradient(135deg, rgba(120, 72, 43, 0.98), rgba(62, 34, 35, 0.98));
          box-shadow:
            0 20px 46px rgba(0, 0, 0, 0.24),
            inset 0 0 42px rgba(0, 0, 0, 0.24);
        }

        .table-prop {
          position: absolute;
          pointer-events: none;
        }

        .table-prop-cup {
          left: 18%;
          top: 34%;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 45%, #fff7ed 0 28%, #a16207 31% 45%, transparent 48%);
          box-shadow: 0 0 18px rgba(253, 230, 138, 0.22);
        }

        .table-prop-tea {
          right: 20%;
          top: 30%;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 45%, #fef3c7 0 32%, #92400e 34% 52%, transparent 55%);
        }

        .table-prop-receipt {
          left: 30%;
          bottom: 22%;
          width: 78px;
          height: 34px;
          border-radius: 8px;
          background:
            repeating-linear-gradient(180deg, #fff7ed 0 7px, #fde68a 8px 9px);
          opacity: 0.9;
          transform: rotate(-7deg);
        }

        .table-prop-swatches {
          right: 28%;
          bottom: 22%;
          width: 88px;
          height: 30px;
          border-radius: 999px;
          background:
            linear-gradient(90deg, #fb7185 0 18%, #f59e0b 18% 36%, #22c55e 36% 54%, #38bdf8 54% 72%, #a78bfa 72% 100%);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
          opacity: 0.86;
        }

        .table-prop-flowers {
          left: 47%;
          top: 30%;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 30% 30%, #fecdd3 0 12%, transparent 13%),
            radial-gradient(circle at 68% 38%, #f9a8d4 0 13%, transparent 14%),
            radial-gradient(circle at 48% 68%, #86efac 0 12%, transparent 13%);
        }

        .table-prop-phone {
          right: 17%;
          bottom: 38%;
          width: 22px;
          height: 38px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 7px;
          background: linear-gradient(180deg, #111827, #374151);
          opacity: 0.55;
          transform: rotate(8deg);
        }

        .front-counter-scene-avatars {
          position: absolute;
          inset: 12% 10%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-content: space-between;
          gap: 16px 34px;
        }

        .scene-avatar-chip {
          display: inline-flex;
          align-items: center;
          justify-self: center;
          gap: 7px;
          max-width: 130px;
          padding: 7px 9px;
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 999px;
          background: rgba(8, 13, 28, 0.46);
          color: var(--cho-neo-text-primary);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
        }

        .scene-avatar-chip > span {
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.18);
        }

        .scene-avatar-chip strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 600;
        }

        .scene-avatar-chip-current {
          border-color: rgba(253, 230, 138, 0.62);
          box-shadow:
            0 0 0 3px rgba(253, 230, 138, 0.12),
            0 12px 24px rgba(0, 0, 0, 0.2);
        }

        .front-counter-table-surface > p {
          position: absolute;
          left: 50%;
          bottom: 18px;
          margin: 0;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.14);
          color: var(--cho-neo-text-accent);
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          transform: translateX(-50%);
        }

        .front-counter-table-surface > p span {
          display: block;
          margin-top: 2px;
          color: rgba(255, 247, 237, 0.64);
          font-size: 10px;
        }

        .front-counter-focused-stage {
          position: relative;
          display: grid;
          gap: 12px;
          overflow: visible;
          aspect-ratio: unset;
          min-height: auto;
          border: 0;
          border-radius: 30px;
          background: transparent;
          box-shadow: none;
        }

        .front-counter-focused-stage::before {
          display: none;
        }

        .front-counter-artwork-frame {
          display: grid;
          place-items: center;
          width: 100%;
          min-height: clamp(320px, 52vw, 560px);
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 26px;
          background: #2c1a17;
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
        }

        .front-counter-artwork-surface {
          position: relative;
          overflow: hidden;
          width: min(100%, calc(clamp(320px, 52vw, 560px) * 1.499));
          aspect-ratio: 1535 / 1024;
          border-radius: 25px;
          background: #2c1a17;
        }

        .front-counter-focused-image {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transform: none;
          filter: saturate(1.04) brightness(1.03) contrast(0.98);
        }

        .shop-talk-focused-stage .front-counter-artwork-surface {
          width: min(100%, calc(clamp(320px, 52vw, 560px) * 1.776));
          aspect-ratio: 1671 / 941;
        }

        .shop-talk-focused-stage .front-counter-focused-image {
          object-fit: contain;
          background: #1f1412;
        }

        .shop-talk-room-caption {
          display: grid;
          gap: 4px;
          width: min(100%, calc(clamp(320px, 52vw, 560px) * 1.776));
          margin: 9px auto 0;
          color: var(--room-pass2-text-secondary);
        }

        .shop-talk-room-caption strong {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 8px;
          color: var(--cho-neo-text-primary);
          font-family: var(--cho-neo-font-display);
          font-size: clamp(19px, 2.5vw, 28px);
          font-weight: 500;
          line-height: 1.05;
        }

        .shop-talk-room-caption strong span {
          color: var(--room-pass2-text-muted);
          font-size: 0.48em;
          font-weight: 400;
        }

        .shop-talk-room-caption p {
          max-width: 680px;
          margin: 0;
          color: var(--room-pass2-text-secondary);
          font-size: 13px;
          font-weight: 500;
          line-height: 1.38;
        }

        .front-counter-scene-ambience {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .front-counter-ambient-glow,
        .front-counter-ambient-steam,
        .front-counter-ambient-reflection {
          position: absolute;
          display: block;
          pointer-events: none;
        }

        .front-counter-ambient-glow {
          border-radius: 999px;
          filter: blur(8px);
          transform: translate3d(-50%, -50%, 0);
          will-change: opacity, transform;
        }

        .front-counter-ambient-lantern {
          left: 73%;
          top: 16%;
          width: 18%;
          height: 23%;
          background:
            radial-gradient(circle at 46% 45%, rgba(255, 214, 130, 0.52), rgba(232, 127, 48, 0.22) 42%, transparent 72%);
          opacity: 0.54;
          animation: frontCounterLanternGlow 6.8s ease-in-out 500ms infinite;
        }

        .front-counter-ambient-counter {
          left: 37%;
          top: 53%;
          width: 30%;
          height: 21%;
          background:
            radial-gradient(ellipse at 50% 55%, rgba(255, 216, 143, 0.36), rgba(185, 88, 38, 0.16) 48%, transparent 74%);
          opacity: 0.42;
          animation: frontCounterCounterGlow 8.9s ease-in-out 1.6s infinite;
        }

        .front-counter-ambient-steam {
          left: 64%;
          top: 38%;
          width: 8%;
          height: 18%;
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 20%, rgba(255, 247, 237, 0.34), transparent 42%),
            linear-gradient(180deg, transparent, rgba(255, 247, 237, 0.24), transparent);
          filter: blur(7px);
          opacity: 0.26;
          transform: translate3d(0, 8px, 0) rotate(-5deg);
          animation: frontCounterSteamDrift 7.4s ease-in-out 900ms infinite;
        }

        .front-counter-ambient-reflection {
          left: 31%;
          bottom: 10%;
          width: 34%;
          height: 10%;
          border-radius: 999px;
          background:
            linear-gradient(90deg, transparent, rgba(255, 206, 120, 0.22), transparent);
          filter: blur(9px);
          opacity: 0.34;
          transform: rotate(-5deg);
          animation: frontCounterReflectionWarmth 10.5s ease-in-out 2.2s infinite;
        }

        .front-counter-focused-scrim {
          display: none;
        }

        .front-counter-focused-scrim::after {
          content: "";
          position: absolute;
          left: 4%;
          right: 4%;
          bottom: 0;
          height: 33%;
          background:
            linear-gradient(180deg, transparent, rgba(37, 22, 18, 0.34)),
            radial-gradient(ellipse at 50% 100%, rgba(37, 22, 18, 0.38), transparent 72%);
        }

        .front-counter-conversation-panel {
          display: grid;
          gap: 8px;
          padding: 12px 14px;
          border: 1px solid #c7bab1;
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255, 254, 252, 0.92), rgba(251, 242, 236, 0.9));
          color: #2f2926;
          box-shadow:
            0 16px 34px rgba(27, 18, 14, 0.18),
            0 0 0 1px rgba(255, 254, 252, 0.62),
            inset 0 1px 0 rgba(255, 255, 255, 0.74);
        }

        .front-counter-conversation-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 2px 6px;
          border-bottom: 1px solid rgba(199, 186, 177, 0.7);
        }

        .front-counter-conversation-heading h3 {
          margin: 0;
          color: #4f2924;
          font-family: var(--cho-neo-font-display);
          font-size: clamp(18px, 2.2vw, 24px);
          font-weight: 600;
          line-height: 1.1;
          letter-spacing: 0;
        }

        .front-counter-conversation-stream {
          display: grid;
          gap: 10px;
          max-height: min(52vh, 520px);
          overflow-y: auto;
          padding: 2px 4px 4px;
          scrollbar-color: rgba(115, 55, 49, 0.35) transparent;
        }

        .front-counter-conversation-message {
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr);
          gap: 9px;
          align-items: start;
          padding: 7px 2px;
          border-bottom: 1px solid rgba(199, 186, 177, 0.38);
        }

        .front-counter-conversation-message:last-child {
          border-bottom: 0;
        }

        .front-counter-conversation-message-muted {
          opacity: 0.62;
        }

        .front-counter-conversation-avatar {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          overflow: hidden;
          border: 1px solid rgba(146, 64, 14, 0.24);
          border-radius: 999px;
          background: rgba(255, 248, 241, 0.84);
          color: #6f2b21;
          font-size: 11px;
          font-weight: 600;
        }

        .front-counter-conversation-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .front-counter-conversation-copy {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .front-counter-conversation-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 7px;
          min-width: 0;
        }

        .front-counter-conversation-meta strong {
          min-width: 0;
          overflow: hidden;
          color: #2f2926;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.18;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .front-counter-conversation-meta time {
          flex: 0 0 auto;
          color: #7f746e;
          font-size: 11px;
          font-weight: 400;
          line-height: 1.1;
        }

        .front-counter-conversation-copy p,
        .front-counter-conversation-empty {
          margin: 0;
          color: #3c342f;
          font-size: 15px;
          font-weight: 400;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .front-counter-conversation-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          margin-top: 2px;
        }

        .front-counter-conversation-actions button {
          min-height: 30px;
          padding: 0 9px;
          border: 1px solid rgba(199, 186, 177, 0.86);
          border-radius: 10px;
          color: #6f2b21;
          background: rgba(255, 254, 252, 0.64);
          font: inherit;
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
          cursor: pointer;
        }

        .front-counter-conversation-actions button:hover:not(:disabled),
        .front-counter-conversation-actions button:focus-visible {
          border-color: rgba(115, 55, 49, 0.34);
          background: rgba(255, 248, 241, 0.9);
          outline: none;
        }

        .front-counter-conversation-actions button:disabled {
          cursor: not-allowed;
          color: #9a8f88;
          background: rgba(244, 239, 235, 0.72);
          opacity: 1;
        }

        .front-counter-stage-bubbles {
          position: relative;
          z-index: 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          justify-content: center;
          gap: 9px;
          align-items: end;
          pointer-events: auto;
        }

        .front-counter-stage-bubbles::before {
          display: none;
        }

        .front-counter-stage-bubble {
          animation: frontCounterNoteIn 420ms ease-out both;
          width: min(100%, 520px);
          max-width: 100%;
          padding: 14px 15px;
          border: 1px solid #c7bab1;
          border-radius: 15px 15px 15px 6px;
          background:
            linear-gradient(180deg, #fffefc, #fff8f1);
          color: #2f2926;
          box-shadow:
            0 14px 28px rgba(27, 18, 14, 0.24),
            0 0 0 1px rgba(255, 254, 252, 0.72),
            inset 0 1px 0 rgba(255, 255, 255, 0.86);
        }

        .front-counter-stage-bubble-right {
          justify-self: end;
          margin-top: 22px;
          border-radius: 15px 15px 6px 15px;
          background:
            linear-gradient(180deg, #fffaf0, #f7d08f);
        }

        .front-counter-stage-bubble-left {
          margin-bottom: 34px;
        }

        .front-counter-stage-bubble-muted {
          opacity: 0.72;
        }

        .front-counter-bubble-header {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          margin-bottom: 4px;
        }

        .front-counter-bubble-avatar {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
          border: 1px solid rgba(63, 36, 24, 0.12);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 28%, rgba(255, 247, 237, 0.4), transparent 42%),
            rgba(255, 247, 237, 0.42);
          font-size: 11px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.54);
        }

        .front-counter-bubble-avatar-image {
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
          border: 1px solid rgba(63, 36, 24, 0.12);
          border-radius: 999px;
          object-fit: cover;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.54);
        }

        .front-counter-bubble-header > div {
          min-width: 0;
        }

        .front-counter-bubble-header strong {
          display: flex;
          align-items: baseline;
          gap: 4px;
          min-width: 0;
          color: #2f2926;
          font-family: var(--cho-neo-font-display);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.12;
        }

        .front-counter-bubble-header strong span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .front-counter-bubble-header strong span {
          max-width: 104px;
          color: #6b625d;
          font-size: 11px;
          font-weight: 600;
        }

        .front-counter-bubble-header small {
          display: block;
          margin-top: 2px;
          color: #6b625d;
          font-size: 11.5px;
          font-weight: 600;
          line-height: 1.2;
        }

        .front-counter-stage-bubble p {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 4;
          margin: 0;
          color: #2f2926;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.48;
        }

        .front-counter-bubble-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 6px;
        }

        .front-counter-bubble-controls button {
          min-height: 21px;
          padding: 5px 9px;
          border: 1px solid #c7bab1;
          border-radius: 10px;
          color: #4f4641;
          background: rgba(255, 254, 252, 0.82);
          font: inherit;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .front-counter-bubble-controls button span {
          display: none;
        }

        .front-counter-bubble-controls button:disabled {
          cursor: not-allowed;
          opacity: 0.46;
        }

        .front-counter-stage-form {
          position: relative;
          z-index: 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          align-items: center;
          margin: 0;
          padding: 15px;
          border: 1px solid #c7bab1;
          border-radius: 22px;
          background:
            linear-gradient(180deg, #fffefc, #fbf2ec);
          box-shadow:
            0 16px 34px rgba(27, 18, 14, 0.24),
            0 0 0 1px rgba(255, 254, 252, 0.62),
            inset 0 1px 0 rgba(255, 255, 255, 0.74);
        }

        .front-counter-stage-form label,
        .front-counter-stage-posting-as,
        .front-counter-stage-feedback,
        .front-counter-stage-count {
          margin: 0;
        }

        .front-counter-stage-form label {
          color: #7c2d12;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0;
        }

        .front-counter-stage-form label span,
        .front-counter-stage-posting-as span,
        .front-counter-stage-feedback span,
        .front-counter-stage-count span,
        .front-counter-stage-seat-button span,
        .front-counter-stage-message-row button span {
          display: block;
        }

        .front-counter-stage-form label span {
          margin-top: 2px;
          color: rgba(92, 45, 24, 0.56);
          font-size: 8px;
          letter-spacing: 0.04em;
        }

        .front-counter-stage-posting-as,
        .front-counter-stage-feedback,
        .front-counter-stage-count {
          color: #4f4641;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.4;
        }

        .front-counter-stage-posting-as strong {
          color: #7c2d12;
        }

        .front-counter-stage-seat-button,
        .front-counter-stage-message-row button {
          border: 0;
          border-radius: 12px;
          color: #3f2418;
          background: #fde68a;
          font: inherit;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .front-counter-stage-seat-button {
          min-height: 34px;
          padding: 7px 10px;
        }

        .front-counter-stage-message-row {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) auto;
          align-items: center;
          gap: 6px;
        }

        .front-counter-input-avatar {
          display: grid;
          grid-template-rows: 20px 10px;
          place-items: center;
          width: 38px;
          min-width: 0;
          height: 38px;
          padding: 3px;
          border: 1px solid rgba(146, 64, 14, 0.28);
          border-radius: 12px;
          color: #5c2d18;
          background: rgba(255, 255, 255, 0.74);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
        }

        .front-counter-stage-message-row .front-counter-input-avatar span {
          display: grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.42);
          font-size: 11px;
        }

        .front-counter-stage-message-row .front-counter-input-avatar img {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          object-fit: cover;
        }

        .front-counter-input-avatar strong {
          max-width: 26px;
          overflow: hidden;
          color: #7c2d12;
          font-size: 8px;
          font-weight: 600;
          line-height: 1;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .front-counter-stage-message-row input {
          width: 100%;
          min-width: 0;
          min-height: 48px;
          border: 1px solid #c7bab1;
          border-radius: 12px;
          padding: 12px 14px;
          color: #2f2926;
          background: #fffefc;
          font: inherit;
          font-size: 16px;
          font-weight: 400;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            0 0 0 1px rgba(255, 254, 252, 0.62);
        }

        .front-counter-stage-message-row input::placeholder {
          color: #756c67;
          opacity: 1;
        }

        .front-counter-stage-form:focus-within {
          border-color: #8d7d74;
          box-shadow:
            0 16px 34px rgba(45, 18, 8, 0.22),
            0 0 0 3px rgba(184, 95, 85, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.68);
        }

        .front-counter-stage-message-row > button:not(.front-counter-input-avatar) {
          min-width: 96px;
          min-height: 48px;
          padding: 10px 16px;
          border: 1px solid rgba(115, 55, 49, 0.22);
          border-radius: 14px;
          color: #fffefc;
          background: #b85f55;
          box-shadow: 0 10px 20px rgba(97, 45, 39, 0.26);
        }

        .front-counter-stage-message-row input:disabled {
          cursor: not-allowed;
          color: #6b625d;
          background: #f4efeb;
          opacity: 1;
        }

        .front-counter-stage-message-row button:disabled {
          cursor: not-allowed;
          color: rgba(255, 254, 252, 0.86);
          background: #c9948d;
          box-shadow: none;
          opacity: 1;
        }

        .front-counter-stage-feedback,
        .front-counter-stage-count {
          grid-column: 1 / -1;
        }

        .front-counter-stage-etiquette {
          display: grid;
          gap: 6px;
          padding: 10px 11px;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 16px;
          color: var(--room-pass2-text-secondary);
          background: rgba(99, 52, 44, 0.58);
        }

        .front-counter-stage-etiquette strong {
          display: block;
          color: var(--cho-neo-text-accent);
          font-size: 11px;
          font-weight: 600;
        }

        .front-counter-stage-etiquette strong span {
          display: block;
          margin-top: 2px;
          color: var(--room-pass2-text-muted);
          font-size: 9px;
        }

        .front-counter-stage-etiquette ul {
          display: grid;
          gap: 2px;
          margin: 7px 0 0;
          padding: 0;
          list-style: none;
        }

        .front-counter-stage-etiquette li,
        .front-counter-stage-etiquette p {
          margin: 0;
          font-size: 10px;
          font-weight: 400;
          line-height: 1.25;
        }

        .front-counter-stage-etiquette p {
          margin-top: 6px;
          color: var(--room-pass2-text-muted);
        }

        .table-host-nudge {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin: 0 0 12px;
          padding: 10px 11px;
          border: 1px solid var(--room-pass2-border);
          border-radius: 18px;
          color: var(--cho-neo-text-primary);
          background:
            radial-gradient(circle at 12% 0%, rgba(217, 141, 126, 0.18), transparent 34%),
            var(--room-pass2-surface);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
        }

        .table-host-nudge strong {
          display: block;
          color: var(--cho-neo-text-accent);
          font-size: 12px;
          font-weight: 600;
          line-height: 1.1;
        }

        .table-host-nudge p {
          margin: 4px 0 0;
          color: var(--room-pass2-text-secondary);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.32;
        }

        .table-host-nudge button {
          width: 28px;
          height: 28px;
          flex: 0 0 auto;
          border: 0;
          border-radius: 999px;
          color: #422006;
          background: #fde68a;
          font-size: 18px;
          font-weight: 600;
          line-height: 1;
        }

        .front-counter-stage-safety,
        .table-safety-line {
          margin: 2px 2px 0;
          color: rgba(92, 45, 24, 0.68);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.32;
        }

        .front-counter-stage-safety span,
        .table-safety-line span {
          display: block;
          margin-top: 2px;
          color: rgba(92, 45, 24, 0.46);
          font-size: 12px;
          font-weight: 400;
        }

        .front-counter-stage-form .front-counter-stage-safety {
          color: rgba(92, 45, 24, 0.68);
        }

        .front-counter-stage-form .front-counter-stage-safety span {
          color: rgba(92, 45, 24, 0.48);
        }

        .table-light-rules {
          margin-top: 10px;
          border: 1px solid rgba(146, 64, 14, 0.14);
          border-radius: 16px;
          background:
            radial-gradient(circle at 12% 0%, rgba(253, 230, 138, 0.18), transparent 34%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.9), rgba(254, 243, 199, 0.72));
          box-shadow: 0 10px 24px rgba(69, 26, 3, 0.1);
        }

        .table-light-rules summary {
          min-height: 36px;
          padding: 9px 11px;
          color: #7c2d12;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          list-style-position: inside;
        }

        .table-light-rules div {
          display: grid;
          gap: 7px;
          padding: 0 11px 11px;
        }

        .table-light-rules p {
          margin: 0;
          color: rgba(63, 36, 24, 0.82);
          font-size: 12px;
          font-weight: 600;
          line-height: 1.3;
        }

        .table-light-rules p span {
          display: block;
          margin-top: 2px;
          color: rgba(92, 45, 24, 0.54);
          font-size: 10px;
          font-weight: 600;
        }

        .trend-table-rules.table-light-rules,
        .front-counter-stage-etiquette.table-light-rules {
          display: block;
          grid-template-columns: none;
          gap: 0;
          padding: 0;
        }

        .front-counter-focused-stage-drawer-open .front-counter-stage-form {
          display: none;
        }

        .front-counter-stage-drawer {
          position: relative;
          z-index: 0;
          max-height: min(70vh, 520px);
          overflow: auto;
          display: grid;
          gap: 10px;
          padding: 13px;
          border: 1px solid rgba(253, 230, 138, 0.26);
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(34, 20, 18, 0.92), rgba(15, 10, 12, 0.9));
          box-shadow:
            0 26px 58px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 247, 237, 0.1);
          backdrop-filter: blur(18px);
          animation: frontCounterDrawerIn 180ms ease-out;
        }

        .front-counter-stage-drawer-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .front-counter-stage-drawer-heading strong,
        .front-counter-stage-drawer-heading p,
        .front-counter-stage-drawer-heading button,
        .front-counter-stage-drawer-notice {
          margin: 0;
        }

        .front-counter-stage-drawer-heading strong {
          display: block;
          color: var(--cho-neo-text-accent);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .front-counter-stage-drawer-heading strong span,
        .front-counter-stage-drawer-heading p span,
        .front-counter-stage-drawer-heading button span {
          display: block;
        }

        .front-counter-stage-drawer-actions {
          display: flex;
          flex: 0 0 auto;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .front-counter-stage-drawer-heading strong span {
          margin-top: 2px;
          color: rgba(255, 247, 237, 0.6);
          font-size: 9px;
        }

        .front-counter-stage-drawer-heading p,
        .front-counter-stage-drawer-notice {
          margin-top: 6px;
          color: rgba(255, 247, 237, 0.66);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.3;
        }

        .front-counter-stage-drawer-heading button {
          flex: 0 0 auto;
          min-height: 34px;
          padding: 7px 10px;
          border: 1px solid rgba(244, 198, 118, 0.26);
          border-radius: 14px;
          color: rgba(255, 247, 237, 0.82);
          background: rgba(54, 32, 27, 0.5);
          font: inherit;
          font-size: 10px;
          font-weight: 500;
          cursor: pointer;
        }

        .front-counter-stage-thread {
          display: grid;
          gap: 8px;
        }

        .front-counter-stage-host-tools {
          display: grid;
          gap: 8px;
          padding: 10px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 16px;
          background: rgba(253, 230, 138, 0.08);
        }

        .front-counter-stage-host-tools strong,
        .front-counter-stage-host-tools p,
        .front-counter-stage-host-card p {
          margin: 0;
        }

        .front-counter-stage-host-tools strong {
          color: var(--cho-neo-text-accent);
          font-size: 11px;
          font-weight: 600;
        }

        .front-counter-stage-host-tools p {
          color: rgba(255, 247, 237, 0.68);
          font-size: 10px;
          font-weight: 600;
        }

        .front-counter-stage-host-tools input {
          min-width: 0;
          width: 100%;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 999px;
          padding: 8px 10px;
          color: var(--cho-neo-text-primary);
          background: rgba(8, 13, 28, 0.52);
          font: inherit;
          font-size: 11px;
          font-weight: 600;
        }

        .front-counter-stage-host-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .front-counter-stage-host-actions button {
          min-height: 34px;
          border: 1px solid rgba(244, 198, 118, 0.24);
          border-radius: 14px;
          padding: 7px 10px;
          color: rgba(255, 247, 237, 0.84);
          background: rgba(54, 32, 27, 0.5);
          font: inherit;
          font-size: 10px;
          font-weight: 500;
          cursor: pointer;
        }

        .front-counter-stage-host-review {
          display: grid;
          gap: 8px;
        }

        .front-counter-stage-host-card {
          display: grid;
          gap: 5px;
          padding: 8px;
          border: 1px solid rgba(255, 247, 237, 0.12);
          border-radius: 14px;
          background: rgba(8, 13, 28, 0.24);
        }

        .front-counter-stage-host-card small {
          color: var(--cho-neo-text-accent);
          font-size: 10px;
          font-weight: 600;
        }

        .front-counter-stage-host-card p {
          color: rgba(255, 247, 237, 0.78);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.35;
        }

        .front-counter-stage-host-card > div:not(.front-counter-bubble-controls) {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .front-counter-stage-host-card > div:not(.front-counter-bubble-controls) span {
          border-radius: 999px;
          padding: 3px 6px;
          color: rgba(255, 247, 237, 0.72);
          background: rgba(255, 255, 255, 0.08);
          font-size: 9px;
          font-weight: 600;
        }

        .front-counter-stage-thread-note {
          display: grid;
          gap: 4px;
          justify-self: start;
          width: min(520px, 88%);
          padding: 9px 10px;
          border: 1px solid rgba(255, 247, 237, 0.22);
          border-radius: 16px 16px 16px 6px;
          color: #3f2418;
          background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.95), rgba(254, 243, 199, 0.88));
        }

        .front-counter-stage-thread-note.thread-note-warm {
          justify-self: end;
          border-radius: 16px 16px 6px 16px;
          background:
            linear-gradient(180deg, rgba(253, 230, 138, 0.96), rgba(251, 191, 36, 0.86));
        }

        .front-counter-stage-thread-note.thread-note-muted {
          opacity: 0.68;
        }

        .front-counter-stage-thread-note small {
          color: rgba(63, 36, 24, 0.64);
          font-size: 10px;
          font-weight: 600;
        }

        .front-counter-stage-thread-note p {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.35;
        }

        .front-counter-focused-stage .front-counter-stage-form {
          gap: 12px;
          padding: 16px;
          border: 1px solid #c7bab1;
          border-radius: 18px;
          background:
            linear-gradient(180deg, #fffefc, #fbf2ec);
          box-shadow:
            0 18px 38px rgba(27, 18, 14, 0.24),
            0 0 0 1px rgba(255, 254, 252, 0.72),
            inset 0 1px 0 rgba(255, 255, 255, 0.82);
        }

        .front-counter-stage-form .composer-avatar-passport {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          min-height: 52px;
          border-color: rgba(199, 186, 177, 0.84);
          border-radius: 16px;
          color: #2f2926;
          background: rgba(255, 254, 252, 0.92);
          box-shadow: 0 8px 18px rgba(27, 18, 14, 0.1);
        }

        .front-counter-stage-form .composer-avatar-identity {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .front-counter-stage-form .composer-avatar-passport strong {
          color: #2f2926;
          font-weight: 500;
        }

        .front-counter-stage-form .composer-avatar-passport small {
          color: #6b625d;
          font-weight: 400;
        }

        .front-counter-stage-form .composer-avatar-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 11px;
          border: 1px solid rgba(199, 186, 177, 0.84);
          border-radius: 12px;
          color: #6b625d;
          background: rgba(255, 254, 252, 0.52);
          font-size: 11px;
          font-weight: 500;
        }

        .front-counter-focused-stage .front-counter-stage-message-row {
          grid-template-columns: 40px minmax(0, 1fr) auto;
          gap: 10px;
        }

        .front-counter-focused-stage:not(.shop-talk-focused-stage) .front-counter-stage-message-row {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .front-counter-focused-stage .front-counter-input-avatar {
          width: 48px;
          height: 48px;
          border-color: #c7bab1;
          border-radius: 14px;
          color: #2f2926;
          background: #fffefc;
          box-shadow: 0 8px 18px rgba(27, 18, 14, 0.1);
        }

        .front-counter-focused-stage .front-counter-stage-message-row .front-counter-input-avatar span {
          background: rgba(255, 232, 223, 0.78);
        }

        .front-counter-focused-stage .front-counter-input-avatar strong {
          color: #2f2926;
          font-weight: 600;
        }

        .front-counter-focused-stage .front-counter-input-avatar img {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          object-fit: cover;
        }

        .front-counter-focused-stage .front-counter-stage-message-row input {
          min-height: 48px;
          border-color: #c7bab1;
          border-radius: 16px;
          padding: 12px 14px;
          color: #2f2926;
          background: #fffefc;
          font-size: 16px;
          font-weight: 400;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.92),
            0 0 0 1px rgba(255, 254, 252, 0.72);
        }

        .front-counter-focused-stage .front-counter-stage-message-row input::placeholder {
          color: #756c67;
          opacity: 1;
        }

        .front-counter-focused-stage .front-counter-stage-form:focus-within {
          border-color: #8d7d74;
          box-shadow:
            0 18px 38px rgba(27, 18, 14, 0.24),
            0 0 0 3px rgba(184, 95, 85, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.84);
        }

        .front-counter-focused-stage .front-counter-stage-message-row input:focus {
          border-color: #8d7d74;
          outline: none;
          box-shadow:
            0 0 0 3px rgba(184, 95, 85, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.92);
        }

        .front-counter-focused-stage .front-counter-stage-message-row > button:not(.front-counter-input-avatar) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-width: 92px;
          min-height: 48px;
          padding: 10px 17px;
          border: 1px solid rgba(115, 55, 49, 0.26);
          border-radius: 16px;
          color: #fffefc;
          background: #b85f55;
          box-shadow: 0 12px 22px rgba(97, 45, 39, 0.28);
          font-size: 14px;
          font-weight: 600;
        }

        .front-counter-focused-stage .front-counter-stage-message-row > button:not(.front-counter-input-avatar):hover:not(:disabled) {
          border-color: rgba(115, 55, 49, 0.38);
          background: #a94f47;
          box-shadow: 0 14px 24px rgba(97, 45, 39, 0.34);
        }

        .front-counter-focused-stage .front-counter-stage-message-row > button:not(.front-counter-input-avatar):focus-visible {
          outline: 3px solid rgba(184, 95, 85, 0.24);
          outline-offset: 2px;
        }

        .front-counter-focused-stage .front-counter-stage-message-row > button:not(.front-counter-input-avatar):disabled {
          color: rgba(255, 254, 252, 0.88);
          background: #c9948d;
          box-shadow: none;
          opacity: 1;
        }

        .front-counter-send-icon {
          display: grid;
          place-items: center;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: rgba(255, 250, 245, 0.18);
          font-size: 13px;
          line-height: 1;
        }

        .front-counter-send-copy {
          display: grid;
          gap: 1px;
          line-height: 1.05;
        }

        .front-counter-send-copy small {
          color: rgba(255, 250, 245, 0.78);
          font-size: 10px;
          font-weight: 400;
        }

        .front-counter-focused-stage .front-counter-stage-safety {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin: 2px 6px 0;
          color: #4f4641;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.45;
        }

        .front-counter-safety-leaf {
          flex: 0 0 auto;
          color: rgba(217, 111, 97, 0.8);
          font-size: 15px;
          line-height: 1.15;
        }

        .front-counter-focused-stage .front-counter-stage-safety > span:not(.front-counter-safety-leaf) {
          display: block;
          margin: 0;
          color: #4f4641;
          font-size: 14px;
          font-weight: 400;
        }

        .front-counter-focused-stage .front-counter-stage-safety small {
          display: block;
          margin-top: 2px;
          color: #6b625d;
          font-size: 13px;
          font-weight: 400;
        }

        .front-counter-focused-stage .front-counter-stage-feedback,
        .front-counter-focused-stage .front-counter-stage-count {
          color: #4f4641;
          font-size: 13.5px;
          font-weight: 400;
        }

        .front-counter-focused-stage .front-counter-stage-drawer {
          border: 1px solid rgba(141, 92, 69, 0.14);
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(255, 242, 238, 0.96));
          box-shadow:
            0 18px 38px rgba(75, 42, 30, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.82);
          backdrop-filter: none;
        }

        .front-counter-focused-stage .front-counter-stage-drawer-heading strong {
          color: #3b2118;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0;
          text-transform: none;
        }

        .front-counter-focused-stage .front-counter-stage-drawer-heading strong span,
        .front-counter-focused-stage .front-counter-stage-drawer-heading p,
        .front-counter-focused-stage .front-counter-stage-drawer-notice {
          color: rgba(106, 75, 62, 0.68);
          font-weight: 400;
        }

        .front-counter-focused-stage .front-counter-stage-drawer-heading button,
        .front-counter-focused-stage .front-counter-stage-host-actions button {
          border-color: rgba(141, 92, 69, 0.16);
          color: #4a2a1d;
          background: rgba(255, 255, 255, 0.72);
          font-weight: 400;
        }

        .front-counter-focused-stage .front-counter-stage-host-tools,
        .front-counter-focused-stage .front-counter-stage-host-card {
          border-color: rgba(141, 92, 69, 0.14);
          background: rgba(255, 255, 255, 0.58);
        }

        .front-counter-focused-stage .front-counter-stage-host-tools strong,
        .front-counter-focused-stage .front-counter-stage-host-card small {
          color: #4a2a1d;
          font-weight: 500;
        }

        .front-counter-focused-stage .front-counter-stage-host-tools p,
        .front-counter-focused-stage .front-counter-stage-host-card p {
          color: rgba(74, 42, 29, 0.76);
          font-weight: 400;
        }

        .front-counter-focused-stage .front-counter-stage-host-tools input {
          border-color: rgba(141, 92, 69, 0.16);
          color: #3b2118;
          background: rgba(255, 255, 255, 0.9);
          font-weight: 400;
        }

        .front-counter-focused-stage .front-counter-stage-thread {
          gap: 10px;
        }

        .front-counter-focused-stage .front-counter-stage-thread-note {
          gap: 10px;
          width: min(560px, 94%);
          padding: 15px 16px;
          border: 1px solid #c7bab1;
          border-radius: 18px;
          color: #2f2926;
          background: linear-gradient(180deg, #fffefc, #fff8f1);
          box-shadow:
            0 14px 30px rgba(27, 18, 14, 0.22),
            0 0 0 1px rgba(255, 254, 252, 0.72);
        }

        .front-counter-focused-stage .front-counter-stage-thread-note.thread-note-warm {
          border-radius: 18px;
          background: linear-gradient(180deg, #fffaf0, #f7d08f);
        }

        .front-counter-focused-stage .front-counter-stage-thread-note.thread-note-muted {
          opacity: 0.74;
        }

        .front-counter-focused-stage .front-counter-bubble-header {
          gap: 8px;
          margin-bottom: 0;
        }

        .front-counter-focused-stage .front-counter-bubble-avatar,
        .front-counter-focused-stage .front-counter-bubble-avatar-image {
          width: 30px;
          height: 30px;
          border-color: rgba(141, 92, 69, 0.16);
          background: rgba(255, 232, 223, 0.7);
          font-size: 14px;
        }

        .front-counter-focused-stage .front-counter-bubble-header strong {
          color: #2f2926;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0;
        }

        .front-counter-focused-stage .front-counter-bubble-header strong span,
        .front-counter-focused-stage .front-counter-bubble-header small,
        .front-counter-focused-stage .front-counter-stage-thread-note small {
          color: #6b625d;
          font-size: 13px;
          font-weight: 600;
        }

        .front-counter-focused-stage .front-counter-stage-thread-note p {
          color: #2f2926;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.52;
        }

        .front-counter-focused-stage .front-counter-bubble-controls {
          gap: 8px;
          margin-top: 4px;
        }

        .front-counter-focused-stage .front-counter-bubble-controls button {
          min-height: 28px;
          padding: 5px 10px;
          border: 1px solid #c7bab1;
          border-radius: 10px;
          color: #4f4641;
          background: rgba(255, 254, 252, 0.78);
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
        }

        .front-counter-focused-stage .front-counter-bubble-controls button:hover:not(:disabled) {
          border-color: #a8978d;
          color: #2f2926;
          background: #fffefc;
        }

        .shop-talk-prompt-strip {
          gap: 8px;
          padding: 12px;
        }

        .shop-talk-prompt-strip strong {
          display: block;
          color: #2f2926;
          font-size: 14px;
          font-weight: 600;
        }

        .shop-talk-prompt-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }

        .shop-talk-prompt-chip {
          flex: 0 0 auto;
          min-height: 34px;
          padding: 7px 11px;
          border: 1px solid #c7bab1;
          border-radius: 12px;
          color: #4f4641;
          background: #fffefc;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease;
        }

        .shop-talk-prompt-chip:hover,
        .shop-talk-prompt-chip:focus-visible {
          border-color: #a8978d;
          color: #2f2926;
          background: #fff8f1;
        }

        .shop-talk-prompt-chip:focus-visible {
          outline: 3px solid rgba(184, 95, 85, 0.18);
          outline-offset: 2px;
        }

        .detail-panel-front-counter > .host-tools-panel,
        .detail-panel-front-counter > .moderation-notice,
        .detail-panel-front-counter > .daily-table-talk,
        .detail-panel-front-counter > .front-counter-atmosphere,
        .detail-panel-front-counter > .mock-thread {
          display: none;
        }

        @keyframes frontCounterDrawerIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes frontCounterLanternGlow {
          0%, 100% { opacity: 0.42; transform: translate3d(-50%, -50%, 0) scale(0.98); }
          36% { opacity: 0.68; transform: translate3d(-50%, -50%, 0) scale(1.04); }
          61% { opacity: 0.5; transform: translate3d(-50%, -50%, 0) scale(1); }
          78% { opacity: 0.62; transform: translate3d(-50%, -50%, 0) scale(1.03); }
        }

        @keyframes frontCounterCounterGlow {
          0%, 100% { opacity: 0.34; transform: translate3d(-50%, -50%, 0) scale(0.99); }
          43% { opacity: 0.52; transform: translate3d(-50%, -50%, 0) scale(1.03); }
          70% { opacity: 0.4; transform: translate3d(-50%, -50%, 0) scale(1); }
        }

        @keyframes frontCounterSteamDrift {
          0%, 100% { opacity: 0.18; transform: translate3d(0, 8px, 0) rotate(-5deg) scaleY(0.96); }
          46% { opacity: 0.34; transform: translate3d(8px, -10px, 0) rotate(3deg) scaleY(1.08); }
          72% { opacity: 0.24; transform: translate3d(3px, -3px, 0) rotate(-1deg) scaleY(1); }
        }

        @keyframes frontCounterReflectionWarmth {
          0%, 100% { opacity: 0.24; transform: translateX(-10px) rotate(-5deg); }
          45% { opacity: 0.42; transform: translateX(16px) rotate(-5deg); }
          72% { opacity: 0.3; transform: translateX(4px) rotate(-5deg); }
        }

        @keyframes frontCounterNoteIn {
          from { opacity: 0; transform: translateY(7px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes trendTableSunrayDrift {
          0% {
            opacity: 0;
            transform: translate3d(-42%, 0, 0);
          }
          12% {
            opacity: 0.12;
          }
          48% {
            opacity: 0.18;
            transform: translate3d(12%, 0, 0);
          }
          72% {
            opacity: 0.13;
            transform: translate3d(32%, 0, 0);
          }
          86%,
          100% {
            opacity: 0;
            transform: translate3d(46%, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .front-counter-ambient-glow,
          .front-counter-ambient-steam,
          .front-counter-ambient-reflection,
          .front-counter-stage-bubble,
          .front-counter-stage-drawer,
          .trend-table-stage::after {
            animation: none;
          }

          .trend-table-stage::after {
            opacity: 0.07;
            transform: translate3d(6%, 0, 0);
          }

          .front-counter-ambient-lantern {
            opacity: 0.5;
          }

          .front-counter-ambient-counter {
            opacity: 0.34;
          }

          .front-counter-ambient-steam,
          .front-counter-ambient-reflection {
            opacity: 0.18;
          }
        }

        .mock-thread {
          display: grid;
          gap: 12px;
          margin-top: 16px;
          padding: 14px;
          border: 1px solid rgba(146, 64, 14, 0.14);
          border-radius: 24px;
          background:
            radial-gradient(circle at 12% 0%, rgba(253, 230, 138, 0.18), transparent 34%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.9), rgba(254, 243, 199, 0.74));
          box-shadow: 0 14px 34px rgba(69, 26, 3, 0.12);
        }

        .detail-panel-trend-table .mock-thread.trend-table-thread {
          margin-top: 8px;
          padding: 14px;
          border: 1px solid rgba(146, 64, 14, 0.08);
          border-radius: 8px;
          background: #fbf6ef;
          box-shadow: none;
        }

        .detail-panel-front-counter .mock-thread {
          max-height: 240px;
          overflow: auto;
          margin-top: 10px;
          padding: 10px;
          border-color: rgba(253, 230, 138, 0.14);
          border-radius: 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(253, 230, 138, 0.1), transparent 30%),
            rgba(24, 16, 18, 0.28);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .detail-panel-front-counter .thread-message {
          padding: 9px 10px;
          border-radius: 16px;
        }

        .detail-panel-front-counter .conversation-form {
          margin-top: 14px;
          border-color: rgba(253, 230, 138, 0.16);
          background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.09), rgba(255, 247, 237, 0.045)),
            rgba(33, 22, 21, 0.5);
        }

        .daily-table-talk {
          display: grid;
          gap: 6px;
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 16px;
          background:
            linear-gradient(180deg, rgba(253, 230, 138, 0.12), rgba(255, 247, 237, 0.055)),
            rgba(8, 13, 28, 0.34);
        }

        .daily-table-talk p {
          margin: 0;
          color: var(--cho-neo-text-accent);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .daily-table-talk p span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 10px;
          letter-spacing: 0.02em;
        }

        .daily-table-talk strong {
          max-width: 760px;
          color: var(--cho-neo-text-primary);
          font-size: 14px;
          line-height: 1.28;
        }

        .daily-table-talk strong span {
          display: block;
          margin-top: 5px;
          color: rgba(255, 247, 237, 0.66);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.35;
        }

        .daily-table-talk > span {
          color: rgba(255, 247, 237, 0.68);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
        }

        .daily-table-talk > span small {
          display: block;
          margin-top: 5px;
          color: rgba(255, 247, 237, 0.56);
          font-size: 10px;
          line-height: 1.4;
        }

        .front-counter-atmosphere {
          display: grid;
          gap: 7px;
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(253, 230, 138, 0.16);
          border-radius: 16px;
          background:
            radial-gradient(circle at 10% 0%, rgba(253, 230, 138, 0.12), transparent 34%),
            rgba(255, 247, 237, 0.07);
        }

        .front-counter-atmosphere strong,
        .front-counter-empty-state strong {
          color: var(--cho-neo-text-accent);
          font-size: 13px;
          font-weight: 600;
        }

        .front-counter-atmosphere strong span {
          display: block;
          margin-top: 4px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 12px;
          line-height: 1.35;
        }

        .front-counter-atmosphere div {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .front-counter-atmosphere div span {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          padding: 5px 8px;
          color: rgba(255, 247, 237, 0.76);
          background: rgba(8, 13, 28, 0.28);
          font-size: 10px;
          font-weight: 600;
        }

        .front-counter-atmosphere p,
        .front-counter-empty-state p {
          margin: 0;
          color: rgba(255, 247, 237, 0.68);
          font-size: 11px;
          line-height: 1.45;
        }

        .front-counter-empty-state {
          display: grid;
          gap: 7px;
          justify-self: stretch;
          padding: 14px;
          border: 1px dashed rgba(253, 230, 138, 0.2);
          border-radius: 18px;
          background: rgba(255, 247, 237, 0.07);
        }

        .host-tools-panel,
        .moderation-notice {
          margin-top: 14px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 18px;
          background: rgba(253, 230, 138, 0.08);
        }

        .host-tools-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(180px, 240px) auto;
          gap: 12px;
          align-items: center;
          padding: 12px;
        }

        .host-tools-panel strong {
          color: var(--cho-neo-text-accent);
          font-size: 13px;
          font-weight: 600;
        }

        .host-tools-panel p {
          margin: 4px 0 0;
          color: rgba(255, 247, 237, 0.66);
          font-size: 12px;
          line-height: 1.35;
        }

        .host-tools-panel input {
          min-height: 38px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          padding: 0 12px;
          color: var(--cho-neo-text-primary);
          background: rgba(8, 13, 28, 0.62);
          font: inherit;
          outline: none;
        }

        .host-tools-panel input::placeholder {
          color: rgba(255, 247, 237, 0.42);
        }

        .host-tools-panel button {
          min-height: 36px;
          border: 0;
          border-radius: 999px;
          padding: 0 12px;
          color: #111827;
          background: #fde68a;
          font-size: 12px;
          font-weight: 600;
        }

        .host-tools-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .host-tools-panel button:disabled {
          cursor: not-allowed;
          color: rgba(255, 247, 237, 0.54);
          background: rgba(255, 255, 255, 0.14);
        }

        .moderation-notice {
          margin-bottom: -6px;
          padding: 10px 12px;
          color: rgba(255, 247, 237, 0.74);
          font-size: 12px;
          font-weight: 600;
          line-height: 1.4;
        }

        .host-review-content {
          display: grid;
          grid-column: 1 / -1;
          gap: 10px;
          padding-top: 2px;
        }

        .host-review-content > p {
          margin: 0;
          color: rgba(255, 247, 237, 0.68);
          font-size: 13px;
          line-height: 1.4;
        }

        .host-review-list {
          display: grid;
          gap: 9px;
        }

        .host-review-card {
          display: grid;
          gap: 9px;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 15px;
          background: rgba(255, 247, 237, 0.08);
        }

        .host-review-card small {
          display: block;
          color: var(--cho-neo-text-accent);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .host-review-card p {
          margin: 5px 0 0;
          color: rgba(255, 247, 237, 0.78);
          font-size: 13px;
          line-height: 1.4;
        }

        .host-review-labels {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .host-review-labels span {
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 999px;
          padding: 4px 8px;
          color: rgba(255, 247, 237, 0.76);
          background: rgba(8, 13, 28, 0.28);
          font-size: 11px;
          font-weight: 600;
        }

        .thread-message {
          position: relative;
          width: min(82%, 430px);
          padding: 12px 14px;
          border: 1px solid rgba(146, 64, 14, 0.14);
          background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.96), rgba(254, 243, 199, 0.82)),
            rgba(255, 255, 255, 0.36);
          box-shadow: 0 12px 28px rgba(69, 26, 3, 0.14);
        }

        .thread-avatar {
          position: absolute;
          top: -9px;
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(146, 64, 14, 0.16);
          border-radius: 999px;
          background: rgba(255, 247, 237, 0.94);
          font-size: 15px;
        }

        .thread-message-left {
          justify-self: start;
          border-radius: 18px 18px 18px 6px;
        }

        .thread-message-left .thread-avatar {
          left: -8px;
        }

        .thread-message-right {
          justify-self: end;
          border-radius: 18px 18px 6px 18px;
          background:
            linear-gradient(180deg, rgba(254, 243, 199, 0.96), rgba(253, 230, 138, 0.66)),
            rgba(255, 247, 237, 0.5);
          border-color: rgba(146, 64, 14, 0.16);
        }

        .thread-message-right .thread-avatar {
          right: -8px;
        }

        .thread-message small {
          display: block;
          color: rgba(124, 45, 18, 0.7);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .thread-message p {
          margin: 6px 0 0;
          color: #3f2418;
          font-size: 14px;
          line-height: 1.45;
        }

        .thread-message-removed {
          border-style: dashed;
          background: rgba(255, 247, 237, 0.56);
        }

        .thread-message-removed p {
          color: rgba(63, 36, 24, 0.6);
          font-style: italic;
        }

        .reaction-row {
          display: block;
          margin-top: 8px;
          color: rgba(124, 45, 18, 0.62);
          font-size: 11px;
          font-weight: 600;
        }

        .moderation-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          align-items: center;
          margin-top: 9px;
        }

        .moderation-row button {
          min-height: 27px;
          border: 1px solid rgba(146, 64, 14, 0.12);
          border-radius: 999px;
          padding: 0 9px;
          color: rgba(92, 45, 24, 0.74);
          background: rgba(255, 255, 255, 0.48);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.15;
        }

        .moderation-row button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .moderation-row span {
          color: rgba(124, 45, 18, 0.6);
          font-size: 11px;
          font-weight: 600;
        }

        .conversation-form {
          display: grid;
          gap: 10px;
          margin-top: 16px;
          padding: 14px;
          border: 1px solid rgba(146, 64, 14, 0.16);
          border-radius: 22px;
          background:
            radial-gradient(circle at 12% 0%, rgba(253, 230, 138, 0.24), transparent 34%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.97), rgba(254, 243, 199, 0.88));
          box-shadow:
            0 14px 34px rgba(69, 26, 3, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .prototype-note {
          margin: 0;
          color: rgba(92, 45, 24, 0.66);
          font-size: 13px;
          line-height: 1.4;
        }

        .memory-notice {
          margin: -2px 0 0;
          color: rgba(124, 45, 18, 0.7);
          font-size: 12px;
          font-weight: 600;
          line-height: 1.4;
        }

        .seat-stage {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          align-items: end;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 22px;
          background:
            radial-gradient(circle at 50% 0%, rgba(253, 230, 138, 0.12), transparent 34%),
            rgba(8, 13, 28, 0.34);
        }

        .seat-person {
          position: relative;
          display: grid;
          gap: 6px;
          justify-items: center;
          min-height: 124px;
          align-content: end;
          padding: 8px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.055);
        }

        .seat-person-current {
          box-shadow: inset 0 0 0 1px rgba(253, 230, 138, 0.24);
        }

        .seat-person strong {
          color: var(--cho-neo-text-primary);
          font-size: 12px;
          line-height: 1.1;
          text-align: center;
        }

        .seat-person > span {
          color: rgba(255, 247, 237, 0.55);
          font-size: 11px;
          font-weight: 600;
        }

        .take-seat-button {
          position: relative;
          z-index: 2;
          min-height: 42px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 13px;
          font-weight: 600;
        }

        .identity-needed {
          display: grid;
          gap: 8px;
          padding: 14px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 20px;
          background: rgba(253, 230, 138, 0.08);
        }

        .identity-needed strong {
          color: var(--cho-neo-text-accent);
          font-size: 14px;
        }

        .identity-needed p {
          margin: 0;
          color: rgba(255, 247, 237, 0.7);
          font-size: 13px;
          line-height: 1.4;
        }

        .identity-needed button {
          min-height: 40px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 13px;
          font-weight: 600;
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
          color: var(--cho-neo-text-accent);
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
          color: var(--cho-neo-text-accent);
          font-size: 14px;
          font-weight: 600;
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
          color: var(--cho-neo-text-primary);
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
          font-weight: 600;
        }

        .founding-pass button:disabled {
          cursor: not-allowed;
          color: rgba(255, 247, 237, 0.54);
          background: rgba(255, 255, 255, 0.14);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .pass-error {
          color: #fecdd3 !important;
          font-weight: 600;
        }

        .conversation-form label {
          color: #7c2d12;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          line-height: 1.35;
          text-transform: none;
        }

        .conversation-form label span {
          display: block;
          margin-top: 3px;
          color: rgba(92, 45, 24, 0.58);
          font-size: 10px;
          letter-spacing: 0.02em;
        }

        .posting-helper {
          margin: -3px 0 0;
          color: rgba(92, 45, 24, 0.68);
          font-size: 12px;
          line-height: 1.4;
        }

        .composer-avatar-passport {
          display: inline-flex;
          width: fit-content;
          max-width: 100%;
          min-height: 32px;
          align-items: center;
          gap: 7px;
          justify-self: start;
          border: 1px solid rgba(146, 64, 14, 0.14);
          border-radius: 999px;
          padding: 4px 8px 4px 5px;
          color: #6f2b21;
          background:
            radial-gradient(circle at 12% 0%, rgba(253, 230, 138, 0.2), transparent 34%),
            rgba(255, 255, 255, 0.58);
          text-decoration: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
        }

        .composer-avatar-passport img,
        .composer-avatar-placeholder {
          width: 24px;
          height: 24px;
          flex: 0 0 auto;
          border-radius: 999px;
        }

        .composer-avatar-passport img {
          object-fit: cover;
        }

        .composer-avatar-placeholder {
          display: grid;
          place-items: center;
          color: #111827;
          background: #fde68a;
          font-size: 15px;
          font-weight: 600;
        }

        .composer-avatar-passport strong {
          display: block;
          overflow: hidden;
          color: #6f2b21;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.05;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .composer-avatar-passport small {
          display: block;
          overflow: hidden;
          margin-top: 2px;
          color: rgba(92, 45, 24, 0.58);
          font-size: 9px;
          font-weight: 600;
          line-height: 1.05;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .composer-avatar-action {
          flex: 0 0 auto;
          color: #7c2d12;
          font-size: 10px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
        }

        .composer-avatar-passport-empty {
          color: #7c2d12;
        }

        .front-counter-stage-form .composer-avatar-passport {
          min-height: 30px;
          padding: 3px 8px 3px 4px;
          border-color: rgba(146, 64, 14, 0.14);
          color: #6f2b21;
          background: rgba(255, 255, 255, 0.58);
        }

        .front-counter-stage-form .composer-avatar-passport strong {
          color: #6f2b21;
        }

        .front-counter-stage-form .composer-avatar-passport small,
        .front-counter-stage-form .composer-avatar-action {
          color: rgba(92, 45, 24, 0.58);
        }

        .front-counter-stage-form .composer-avatar-passport img,
        .front-counter-stage-form .composer-avatar-placeholder {
          width: 23px;
          height: 23px;
        }

        .message-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
        }

        .message-row input {
          width: 100%;
          min-height: 42px;
          border: 1px solid rgba(146, 64, 14, 0.18);
          border-radius: 999px;
          padding: 0 14px;
          color: #3f2418;
          background: rgba(255, 255, 255, 0.84);
          font: inherit;
          outline: none;
        }

        .message-row input::placeholder {
          color: rgba(92, 45, 24, 0.46);
        }

        .message-row input:focus {
          border-color: rgba(253, 230, 138, 0.66);
          box-shadow: 0 0 0 3px rgba(253, 230, 138, 0.12);
        }

        .message-row input:disabled {
          cursor: not-allowed;
          color: rgba(92, 45, 24, 0.48);
          background: rgba(255, 247, 237, 0.56);
        }

        .message-row button {
          min-height: 42px;
          padding: 0 16px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 13px;
          font-weight: 600;
        }

        .message-row button:disabled {
          cursor: not-allowed;
          color: rgba(92, 45, 24, 0.48);
          background: rgba(146, 64, 14, 0.12);
          box-shadow: inset 0 0 0 1px rgba(146, 64, 14, 0.08);
        }

        .post-feedback {
          margin: -2px 4px 0 0;
          color: rgba(124, 45, 18, 0.72);
          font-size: 12px;
          font-weight: 600;
          line-height: 1.4;
        }

        .character-count {
          justify-self: end;
          margin: -2px 4px 0 0;
          color: rgba(92, 45, 24, 0.58);
          font-size: 12px;
          font-weight: 600;
          line-height: 1.35;
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
          font-weight: 600;
        }

        .table-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .table-heading p {
          margin: 0 0 8px;
          color: var(--cho-neo-text-accent);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
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
          font-weight: 600;
        }

        .table-heading > span small {
          display: block;
          margin-top: 1px;
          font-size: 9px;
          font-weight: 600;
          opacity: 0.68;
        }

        .topic {
          margin: 16px 0 0;
          color: var(--cho-neo-text-primary);
          font-size: 15px;
          font-weight: 600;
          line-height: 1.35;
        }

        .topic span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.56);
          font-size: 12px;
          font-weight: 600;
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
          font-weight: 600;
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
          font-weight: 600;
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

        .house-rules-front-counter-hidden {
          display: none;
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
          font-weight: 600;
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
          color: var(--cho-neo-text-accent);
          font-size: 13px;
          font-weight: 600;
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

        .host-note div span {
          padding: 6px 9px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(8, 13, 28, 0.42);
          color: rgba(255, 247, 237, 0.78);
          font-size: 12px;
          font-weight: 600;
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

          .gossip-room-stage {
            width: min(820px, 100%);
            border-radius: 30px;
          }

          .gossip-image-lobby .table-hotspot {
            position: absolute !important;
            width: 164px !important;
            min-height: 104px;
          }

          .table-hotspot-1 { left: 18% !important; top: 26% !important; right: auto !important; bottom: auto !important; }
          .table-hotspot-2 { left: 42% !important; top: 45% !important; right: auto !important; bottom: auto !important; }
          .table-hotspot-3 { right: 15% !important; top: 27% !important; left: auto !important; bottom: auto !important; }
          .table-hotspot-4 { left: 15% !important; top: 62% !important; right: auto !important; bottom: auto !important; }
          .table-hotspot-5 { right: 16% !important; top: 62% !important; left: auto !important; bottom: auto !important; }

          .hotspot-label {
            width: 162px;
            padding: 9px;
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
            padding: 14px 12px 18px;
          }

          .cafe-hero,
          .house-rules {
            grid-template-columns: 1fr;
          }

          .cafe-hero {
            flex-direction: column;
            gap: 10px;
          }

          .cafe-hero-actions {
            align-self: flex-end;
          }

          .cafe-stage-controls {
            align-items: center;
          }

          .front-counter-topic-note {
            flex: 0 1 220px;
            width: auto;
          }

          .room-scene {
            border-radius: 28px;
          }

          .house-rules {
            gap: 14px;
          }

          .avatar-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .seat-stage {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .cafe-shell {
            max-width: 100vw;
            overflow-x: hidden;
            padding: 10px 10px 18px;
          }

          h1 {
            max-width: 100%;
            overflow-wrap: anywhere;
            font-size: clamp(30px, 9.5vw, 40px);
          }

          .subtitle {
            margin-top: 6px;
            font-size: 12px;
            line-height: 1.3;
          }

          .cafe-stage-controls {
            gap: 8px;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .cafe-stage-controls::-webkit-scrollbar {
            display: none;
          }

          .cafe-control-row {
            flex: 0 0 auto;
            gap: 6px;
            margin: 0;
          }

          .cafe-hero-actions {
            flex: 0 0 auto;
            gap: 6px;
          }

          .cafe-control-pill {
            min-height: 44px;
            padding: 6px 10px;
            font-size: 10px;
          }

          .compact-table-header {
            flex-wrap: wrap;
            justify-content: flex-start;
            gap: 8px;
            margin-bottom: 8px;
          }

          .compact-table-back {
            flex: 0 0 auto;
            min-height: 30px;
            padding: 5px 9px;
            font-size: 11px;
          }

          .compact-table-enter {
            flex: 0 0 auto;
            min-height: 30px;
            padding: 5px 9px;
            font-size: 11px;
          }

          .compact-table-count {
            flex: 1 1 100%;
            min-width: 0;
            max-width: 100%;
            min-height: 28px;
            margin-left: 0;
            padding: 5px 8px;
            font-size: 10.5px;
            overflow: visible;
            text-align: left;
            white-space: normal;
          }

          .front-counter-quick-controls {
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 6px;
            margin-bottom: 8px;
            overflow-x: visible;
          }

          .front-counter-control-group {
            flex: 0 1 auto;
            gap: 6px;
          }

          .front-counter-action-group {
            margin-left: auto;
          }

          .front-counter-seat-control {
            min-height: 44px;
            font-size: 11px;
          }

          .front-counter-quick-controls .compact-table-back,
          .front-counter-quick-controls .compact-table-count,
          .front-counter-quick-controls :global(.cho-neo-feedback-button),
          .front-counter-theme-audio :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle) {
            min-height: 44px;
            padding: 8px 10px;
            font-size: 11px;
          }

          .front-counter-quick-controls span,
          .front-counter-seat-control span {
            white-space: nowrap;
          }

          .front-counter-count-control {
            flex: 0 1 auto;
            max-width: 100%;
            white-space: normal;
          }

          .front-counter-conversation-panel {
            padding: 10px;
            border-radius: 16px;
          }

          .front-counter-conversation-stream {
            max-height: none;
            padding-inline: 1px;
          }

          .front-counter-conversation-message {
            grid-template-columns: 32px minmax(0, 1fr);
            gap: 8px;
          }

          .front-counter-conversation-avatar {
            width: 32px;
            height: 32px;
          }

          .front-counter-conversation-copy p,
          .front-counter-conversation-empty {
            font-size: 14px;
            line-height: 1.42;
          }

          .gossip-rules-acknowledgement {
            align-items: start;
            overflow-y: auto;
            padding: max(12px, env(safe-area-inset-top)) 10px max(18px, env(safe-area-inset-bottom));
            -webkit-overflow-scrolling: touch;
          }

          .gossip-rules-card {
            border-radius: 20px;
          }

          .gossip-rules-card h2 {
            font-size: clamp(24px, 8vw, 32px);
          }

          .gossip-rules-card li {
            padding: 8px 10px;
            font-size: 12px;
          }

          .identity-picker {
            gap: 10px;
            padding: 12px;
            border-radius: 22px;
          }

          .identity-picker-heading {
            display: grid;
            gap: 8px;
          }

          .identity-picker h2 {
            font-size: clamp(22px, 7.5vw, 30px);
            line-height: 1.02;
          }

          .identity-picker p:not(.eyebrow) {
            margin-top: 6px;
            font-size: 11px;
            line-height: 1.32;
          }

          .identity-picker-heading button {
            min-height: 34px;
            width: 100%;
            font-size: 11px;
          }

          .avatar-grid {
            gap: 8px;
          }

          .avatar-choice {
            min-height: 112px;
            padding: 8px 7px;
            border-radius: 16px !important;
          }

          .avatar-choice-portrait {
            width: 50px;
            height: 50px;
          }

          .avatar-choice-face {
            width: 28px;
            height: 33px;
          }

          .avatar-choice strong {
            font-size: 10px;
          }

          .avatar-choice small {
            display: none;
          }

          .room-scene {
            margin-top: 10px;
            padding: 12px;
            border-radius: 24px;
          }

          .room-scene:not(.room-scene-focused) {
            padding: 0;
          }

          .mobile-table-picker {
            display: grid;
            gap: 8px;
            margin: 10px 0 0;
            max-width: 100%;
            overflow: hidden;
          }

          .mobile-table-picker-heading {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 8px;
            padding: 0 2px;
          }

          .mobile-table-picker-heading strong {
            color: var(--cho-neo-text-accent);
            font-size: 12px;
            font-weight: 600;
          }

          .mobile-table-picker-heading span {
            color: rgba(255, 247, 237, 0.58);
            font-size: 10px;
            font-weight: 600;
          }

          .mobile-table-picker-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            max-width: 100%;
            overflow: visible;
            padding: 0 2px 2px;
          }

        .mobile-table-card {
            display: grid;
            gap: 5px;
            min-height: 82px;
            padding: 13px 12px;
            border: 1px solid rgba(253, 230, 138, 0.22);
            border-radius: 18px;
            background:
              radial-gradient(circle at 12% 0%, rgba(253, 230, 138, 0.16), transparent 34%),
              linear-gradient(180deg, rgba(255, 247, 237, 0.1), rgba(255, 247, 237, 0.045)),
              rgba(28, 18, 18, 0.72);
            color: var(--cho-neo-text-primary);
            font: inherit;
            text-align: left;
            touch-action: manipulation;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 12px 24px rgba(0, 0, 0, 0.18);
          }

          .mobile-table-card strong {
            display: block;
            min-width: 0;
            color: var(--cho-neo-text-primary);
            font-size: 14px;
            font-weight: 600;
            line-height: 1.08;
            overflow-wrap: anywhere;
          }

          .mobile-table-card strong span {
            display: block;
            margin-top: 2px;
            color: rgba(253, 230, 138, 0.72);
            font-size: 10px;
            font-weight: 600;
          }

          .mobile-table-card small {
            display: -webkit-box;
            overflow: hidden;
            color: rgba(255, 247, 237, 0.68);
            font-size: 11px;
            font-weight: 600;
            line-height: 1.25;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }

          .mobile-table-card em {
            color: var(--cho-neo-text-accent);
            font-size: 10px;
            font-style: normal;
            font-weight: 600;
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

          .gossip-room-stage {
            min-height: auto;
            border-radius: 24px;
          }

          .gossip-hotspot-layer {
            display: none;
          }

          .table-detail:has(.detail-panel-trend-table) {
            width: 100%;
            margin-top: 36px;
            padding: 14px;
            border-radius: 24px;
          }

          .detail-panel-trend-table {
            padding: 0;
            border-radius: 0;
          }

          .detail-panel-trend-table .compact-table-header {
            align-items: center;
            gap: 8px;
          }

          .detail-panel-trend-table .compact-table-back,
          .detail-panel-trend-table .compact-table-enter,
          .detail-panel-trend-table .compact-table-count {
            min-height: 44px;
            padding: 7px 10px;
            font-size: 11px;
          }

          .detail-panel-trend-table .compact-table-count {
            margin-left: 0;
            max-width: 100%;
          }

          .detail-panel-trend-table .detail-heading {
            display: grid;
            gap: 3px;
          }

          .detail-panel-trend-table .detail-heading h2 {
            font-size: clamp(25px, 7.2vw, 30px);
          }

          .trend-table-subtitle {
            margin-top: 6px;
            font-size: 12px;
            line-height: 1.4;
          }

          .trend-table-stage {
            border-radius: 20px;
          }

          .trend-table-chip-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px;
            overflow: visible;
            padding: 0;
          }

          .trend-table-topic-chip {
            min-height: 38px;
            min-width: 0;
            padding: 6px 8px;
            grid-template-columns: 14px minmax(0, 1fr);
            justify-items: start;
            column-gap: 6px;
            text-align: left;
          }

          .trend-table-topic-chip > span {
            width: 14px;
            height: 14px;
          }

          .trend-table-topic-chips {
            gap: 7px;
            padding: 10px;
          }

          .trend-table-topic-chips > div:first-child {
            align-items: flex-start;
          }

          .trend-table-topic-chips strong small,
          .trend-table-topic-chips > div:first-child span small {
            font-size: 8px;
          }

          .trend-table-empty-state {
            padding: 13px;
          }

          .trend-table-starter-list > div {
            display: flex;
            flex-wrap: wrap;
          }

          .trend-table-starter-list button {
            min-height: 34px;
          }

          .local-table-stage {
            gap: 10px;
            margin-top: 8px;
          }

          .local-table-heading p {
            margin-bottom: 2px;
            font-size: 10px;
            letter-spacing: 0.02em;
          }

          .local-table-heading h2 {
            font-size: clamp(28px, 9vw, 38px);
            line-height: 0.98;
          }

          .local-table-subtitle {
            margin-top: 0;
            font-size: 12px;
            line-height: 1.36;
          }

          .local-table-subtitle span {
            margin-top: 4px;
            font-size: 10px;
          }

          .local-table-artwork {
            border-radius: 20px;
          }

          .local-table-artwork img {
            aspect-ratio: 16 / 10;
          }

          .local-table-prompts,
          .local-table-thread,
          .local-table-rules {
            border-radius: 18px;
          }

          .local-table-prompts {
            gap: 8px;
            padding: 10px;
          }

          .local-table-prompts > div:first-child,
          .local-table-thread-heading {
            display: grid;
            gap: 3px;
          }

          .local-table-prompts small {
            text-align: left;
          }

          .local-table-chip {
            min-height: 40px;
            padding: 8px 11px;
          }

          .local-table-thread {
            gap: 8px;
            padding: 11px;
          }

          .local-table-note {
            padding: 10px;
            border-radius: 16px;
          }

          .local-table-rules {
            grid-template-columns: 1fr;
            gap: 7px;
            padding: 10px;
          }

          .local-table-rules p {
            font-size: 11px;
          }

          .detail-panel-trend-table .character-count {
            justify-self: start;
            margin-top: -4px;
            color: rgba(92, 45, 24, 0.58);
            font-size: 10px;
            font-weight: 600;
          }

          .detail-panel-trend-table .character-count span {
            color: rgba(92, 45, 24, 0.42);
          }

          .front-counter-count-pill {
            display: inline-flex;
            flex: 1 1 0;
            flex-direction: column;
            justify-content: center;
            min-height: 36px;
            min-width: 0;
            padding: 6px 8px;
            border: 1px solid rgba(253, 230, 138, 0.18);
            border-radius: 999px;
            color: var(--cho-neo-text-accent);
            background: rgba(253, 230, 138, 0.08);
            font-size: 9px;
            font-weight: 600;
            line-height: 1.05;
            text-align: center;
          }

          .front-counter-count-pill small {
            display: block;
            margin-top: 2px;
            color: rgba(255, 247, 237, 0.6);
            font-size: 0.78em;
            font-weight: 600;
          }

          .table-detail:has(.detail-panel-front-counter) {
            width: 100%;
            margin-top: 0;
          }

          .cafe-page:has(.detail-panel-front-counter) .front-counter-topic-note {
            justify-self: start;
            margin-top: 0;
          }

          .detail-panel-front-counter {
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
          }

          .detail-panel-front-counter .detail-heading {
            display: grid;
            gap: 8px;
            padding: 0 2px;
          }

          .detail-panel-front-counter .detail-heading p {
            display: none;
          }

          .detail-panel-front-counter .detail-heading h2 {
            display: none;
          }

          .detail-panel-front-counter .detail-heading strong {
            display: none;
          }

          .detail-panel-front-counter .topic {
            margin: 6px 2px 12px;
            padding: 9px 11px;
            border: 1px solid rgba(253, 230, 138, 0.16);
            border-radius: 14px;
            color: rgba(255, 247, 237, 0.82);
            background: rgba(255, 247, 237, 0.06);
            font-size: 12px;
            line-height: 1.35;
          }

          .detail-panel-front-counter .topic span {
            display: block;
            margin-top: 3px;
            color: rgba(255, 247, 237, 0.52);
            font-size: 10px;
          }

          .front-counter-table-scene {
            border-radius: 0;
          }

          .front-counter-focused-stage {
            display: grid;
            gap: 12px;
            overflow: visible;
            aspect-ratio: unset;
            min-height: 0;
            padding: 0;
            border: 0;
            border-radius: 24px;
            background: transparent;
            box-shadow: none;
          }

          .front-counter-focused-stage::before,
          .front-counter-focused-scrim {
            display: none;
          }

          .front-counter-artwork-frame {
            min-height: clamp(210px, 36svh, 310px);
            border-radius: 24px;
          }

          .front-counter-artwork-surface {
            width: min(100%, calc(clamp(210px, 36svh, 310px) * 1.499));
            border-radius: 23px;
          }

          .front-counter-focused-image {
            position: absolute;
            inset: 0;
            z-index: 0;
            width: 100%;
            height: 100%;
            min-height: 0;
            object-fit: cover;
            object-position: center;
            transform: none;
          }

          .front-counter-stage-bubbles {
            position: relative;
            inset: auto;
            z-index: 0;
            order: 2;
            transform: none;
            grid-template-columns: 1fr;
            justify-items: stretch;
            gap: 7px;
          }

          .front-counter-stage-bubbles::before {
            display: none;
          }

          .front-counter-stage-bubble {
            max-width: 100%;
            padding: 10px 11px;
            border-radius: 16px;
          }

          .front-counter-stage-bubble:nth-last-child(n+3) {
            display: none;
          }

          .shop-talk-stage-feed .front-counter-stage-bubble:nth-last-child(n+3) {
            display: grid;
          }

          .front-counter-stage-bubble-right {
            justify-self: center;
          }

          .front-counter-stage-bubble-left {
            margin-bottom: 0;
          }

          .front-counter-stage-bubble p {
            font-size: 12px;
            line-height: 1.34;
            -webkit-line-clamp: 4;
          }

          .front-counter-stage-etiquette ul {
            grid-template-columns: 1fr 1fr;
            gap: 2px 8px;
          }

          .front-counter-stage-etiquette li,
          .front-counter-stage-etiquette p {
            font-size: 9px;
          }

          .front-counter-bubble-controls {
            gap: 4px;
          }

          .front-counter-bubble-controls button {
            min-height: 34px;
            padding: 6px 11px;
            font-size: 13px;
          }

          .front-counter-stage-form {
            position: relative;
            z-index: 0;
            inset: auto;
            order: 3;
            grid-template-columns: 1fr;
            gap: 6px;
            margin-top: 0;
            padding: 15px;
            border-radius: 20px;
            border-color: #c7bab1;
            background:
              linear-gradient(180deg, #fffefc, #fbf2ec);
          }

          .front-counter-stage-message-row {
            grid-template-columns: 40px minmax(0, 1fr) 68px;
            gap: 8px;
          }

          .front-counter-input-avatar {
            width: 40px;
            height: 40px;
          }

          .front-counter-stage-message-row .front-counter-input-avatar span {
            width: 21px;
            height: 21px;
            font-size: 11px;
          }

          .front-counter-stage-message-row input {
            min-height: 48px;
            padding: 10px 12px;
            font-size: 16px;
          }

          .front-counter-stage-message-row > button:not(.front-counter-input-avatar) {
            min-width: 0;
            min-height: 48px;
            padding: 10px 12px;
            font-size: 14px;
          }

          .gossip-image-lobby .table-hotspot {
            width: 106px !important;
            min-height: 78px;
          }

          .table-hotspot-1 { left: 6% !important; top: 26% !important; right: auto !important; bottom: auto !important; }
          .table-hotspot-2 { left: 36% !important; top: 45% !important; right: auto !important; bottom: auto !important; }
          .table-hotspot-3 { right: 4% !important; top: 27% !important; left: auto !important; bottom: auto !important; }
          .table-hotspot-4 { left: 7% !important; top: 61% !important; right: auto !important; bottom: auto !important; }
          .table-hotspot-5 { right: 6% !important; top: 62% !important; left: auto !important; bottom: auto !important; }

          .hotspot-glow {
            width: 24px;
            height: 24px;
            box-shadow:
              0 0 0 5px rgba(253, 230, 138, 0.08),
              0 0 18px rgba(251, 191, 36, 0.32);
          }

          .hotspot-glow::after {
            font-size: 12px;
          }

          .hotspot-label {
            width: 104px;
            gap: 4px;
            padding: 6px;
            border-radius: 12px;
          }

          .hotspot-label p {
            font-size: 10px;
          }

          .hotspot-label p span,
          .hotspot-label strong {
            font-size: 7px;
          }

          .hotspot-label button {
            min-height: 24px;
            font-size: 8px;
          }

          .cafe-control-pill {
            flex: 1 1 calc(33.333% - 6px);
            min-width: 96px;
            min-height: 42px;
          }

          .current-identity,
          .identity-picker-heading {
            display: grid;
            grid-template-columns: 1fr;
          }

          .identity-picker-heading button,
          .identity-form div button {
            width: 100%;
          }

          .identity-picker {
            padding: 12px;
            border-radius: 22px;
          }

          .identity-picker h2 {
            font-size: clamp(22px, 7.5vw, 30px);
            line-height: 1.02;
          }

          .identity-picker p:not(.eyebrow) {
            font-size: 11px;
            line-height: 1.3;
          }

          .avatar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .avatar-choice {
            min-height: 112px;
            padding: 8px 7px;
          }

          .avatar-choice-portrait {
            width: 50px;
            height: 50px;
          }

          .avatar-choice strong {
            font-size: 10px;
          }

          .avatar-choice small {
            display: none;
          }

          .seat-stage {
            grid-template-columns: 1fr;
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

          .front-counter-table-scene {
            margin-inline: 0;
            padding: 0;
            border-radius: 24px;
          }

          .front-counter-table-surface {
            min-height: 190px;
            border-radius: 28px;
          }

          .front-counter-scene-avatars {
            inset: 12% 6%;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .scene-avatar-chip {
            max-width: 120px;
            padding: 6px 8px;
          }

          .scene-avatar-chip strong {
            font-size: 10px;
          }

          .table-prop-receipt {
            left: 20%;
            bottom: 20%;
            transform: rotate(-5deg) scale(0.86);
          }

          .table-prop-swatches {
            right: 18%;
            bottom: 24%;
            transform: scale(0.82);
            transform-origin: right center;
          }

          .table-prop-phone {
            display: none;
          }

          .table-heading,
          .table-footer,
          .detail-heading {
            flex-direction: column;
            align-items: flex-start;
          }

          .generic-table-artwork {
            margin: 12px 0 14px;
            border-radius: 18px;
          }

          .generic-table-artwork img {
            height: clamp(170px, 48vw, 230px);
          }

          .table-footer button,
          .leave-button,
          .message-row button,
          .founding-pass button {
            width: 100%;
          }

          .host-tools-panel {
            grid-template-columns: 1fr;
          }

          .message-row {
            grid-template-columns: minmax(0, 1fr) minmax(82px, auto);
            gap: 8px;
          }

          .message-row input {
            min-height: 44px;
            padding-inline: 13px;
            font-size: 16px;
          }

          .message-row button {
            width: auto;
            min-height: 44px;
            padding-inline: 12px;
            font-size: 12px;
            touch-action: manipulation;
          }

          .message-row button span {
            display: none;
          }

          .composer-avatar-passport {
            width: 100%;
            min-height: 38px;
            padding: 5px 10px 5px 6px;
            border-radius: 16px;
          }

          .composer-avatar-passport img,
          .composer-avatar-placeholder {
            width: 28px;
            height: 28px;
          }

          .composer-avatar-passport strong {
            min-width: 0;
            font-size: 11px;
          }

          .composer-avatar-passport small {
            font-size: 9px;
          }

          .composer-avatar-action {
            font-size: 9px;
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

        @media (max-width: 640px) {
          .local-table-heading h2 {
            font-size: clamp(28px, 8.5vw, 32px);
            line-height: 1;
          }

          .detail-panel-trend-table .detail-heading h2 {
            font-size: clamp(24px, 7vw, 30px);
            line-height: 1;
          }

          .local-table-subtitle {
            font-size: 16px;
            line-height: 1.42;
          }

          .trend-table-subtitle {
            font-size: 12px;
            line-height: 1.4;
          }

          .table-note-form label,
          .front-counter-stage-form label {
            font-size: 18px;
            line-height: 1.2;
          }

          .mock-thread,
          .conversation-form,
          .local-table-prompts,
          .local-table-thread,
          .table-light-rules {
            border-radius: 18px;
          }

          .mock-thread,
          .conversation-form {
            gap: 9px;
            margin-top: 12px;
            padding: 12px;
          }

          .local-table-prompts,
          .local-table-thread {
            padding: 11px;
          }

          .thread-message,
          .local-table-note {
            padding: 10px 11px;
          }

          .message-row {
            grid-template-columns: 1fr;
            gap: 9px;
          }

          .message-row input {
            min-height: 48px;
            padding-inline: 14px;
            font-size: 17px;
          }

          .message-row button {
            width: 100%;
            min-height: 48px;
            font-size: 17px;
          }

          .message-row button span {
            display: block;
            margin-top: 2px;
            font-size: 11px;
          }

          .detail-panel-trend-table .message-row {
            grid-template-columns: minmax(0, 1fr) 48px;
          }

          .detail-panel-trend-table .message-row button {
            width: 48px;
            min-width: 48px;
            min-height: 48px;
            padding-inline: 0;
          }

          .front-counter-stage-message-row {
            grid-template-columns: 42px minmax(0, 1fr);
          }

          .front-counter-focused-stage:not(.shop-talk-focused-stage) .front-counter-stage-message-row {
            grid-template-columns: minmax(0, 1fr) auto;
          }

          .front-counter-stage-message-row > button:not(.front-counter-input-avatar) {
            grid-column: 1 / -1;
            width: 100%;
            min-height: 48px;
            font-size: 17px;
          }

          .front-counter-focused-stage:not(.shop-talk-focused-stage) .front-counter-stage-message-row > button:not(.front-counter-input-avatar) {
            grid-column: auto;
            width: auto;
            min-width: 72px;
            padding-inline: 14px;
          }

          .front-counter-stage-message-row input {
            min-height: 48px;
            font-size: 17px;
          }

          .front-counter-stage-safety,
          .table-safety-line {
            font-size: 14px;
          }

          .front-counter-stage-safety span,
          .table-safety-line span {
            font-size: 13px;
          }

          .table-host-nudge {
            margin-bottom: 10px;
            padding: 9px 10px;
          }
        }

        @media (max-width: 380px) {
          .message-row {
            grid-template-columns: 1fr;
          }

          .message-row button {
            width: 100%;
          }

          .detail-panel-trend-table .message-row {
            grid-template-columns: minmax(0, 1fr) 48px;
          }

          .detail-panel-trend-table .message-row button {
            width: 48px;
          }
        }
      `}</style>
    </main>
  );
}

function dedupeSeats(
  seats: Array<{ avatarId: string; nickname: string }>
) {
  const seen = new Set<string>();

  return seats.filter((seat) => {
    const key = `${seat.avatarId}:${seat.nickname}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isVisibleFrontCounterMessage(message: FrontCounterMessage) {
  if (message.hiddenAt) {
    return false;
  }

  return message.text.trim().length > 0;
}

function getSharedFrontCounterMessageIds(messages: FrontCounterMessage[]) {
  return messages
    .filter((message) => isSharedFrontCounterMessageId(message.id))
    .map((message) => message.id);
}

function getHostReviewLabels(message: FrontCounterMessage) {
  const labels: string[] = [];

  if ((message.reportCount ?? 0) > 0) {
    labels.push("Reported");
  }

  if (message.hiddenAt) {
    labels.push("Hidden");
  }

  if (message.removedAt) {
    labels.push("Removed");
  }

  return labels;
}

async function updateSharedFrontCounterMessageAsHost(input: {
  action: FrontCounterModerationAction;
  hostKey: string;
  messageId: string;
}) {
  switch (input.action) {
    case "hide":
      return hideSharedFrontCounterMessage(input);
    case "markReviewed":
      return markSharedFrontCounterMessageReviewed(input);
    case "remove":
      return removeSharedFrontCounterMessage(input);
    case "unhide":
      return unhideSharedFrontCounterMessage(input);
  }
}

function getHostModerationNotice(action: FrontCounterModerationAction) {
  switch (action) {
    case "hide":
      return "Message hidden from the Social Counter.";
    case "markReviewed":
      return "Message marked reviewed.";
    case "remove":
      return "Message replaced with a host removal notice.";
    case "unhide":
      return "Message returned to the Social Counter.";
  }
}

function getMeaningfulCharacterCount(value: string) {
  return value.replace(/\s/g, "").length;
}

function getTrendTableNoteBlockNotice(value: string) {
  const normalized = value.trim().toLowerCase();

  if (COLOR_TREND_BLOCKED_SHORT_POSTS.has(normalized)) {
    return "Hỏi hoặc chia sẻ cụ thể hơn một chút. / Ask or share something a little more specific.";
  }

  if (!/[\p{L}\p{N}]/u.test(normalized)) {
    return "Viết bằng chữ một chút để mọi người hiểu. / Add words so people can understand.";
  }

  if (normalized.length < 12) {
    return "Nói rõ hơn bạn đang hỏi màu, mẫu, hay trend gì. / Say more clearly what color, design, or trend you are asking about.";
  }

  if (COLOR_TREND_AD_LANGUAGE.some((phrase) => normalized.includes(phrase))) {
    return "Bàn Màu để nói trend thật, không rao bán. / The Trend Table is for real trend talk, not selling.";
  }

  if (COLOR_TREND_UNSAFE_CLAIM_LANGUAGE.some((phrase) => normalized.includes(phrase))) {
    return "Đừng đưa lời khẳng định y tế hoặc pháp lý ở Bàn Màu. / Do not make medical or legal claims at the Trend Table.";
  }

  return null;
}

function getTableActionCopy(action: string) {
  if (action === "people listening") {
    return {
      vi: "người đang lắng nghe",
      en: "people listening",
    };
  }

  return {
    vi: "người đang bàn chuyện",
    en: "people talking",
  };
}

function getTableNameCopy(tableName: string) {
  const table = tables.find(
    (tableConfig) =>
      tableConfig.id === tableName ||
      tableConfig.legacyName === tableName ||
      tableConfig.name === tableName
  );

  if (table) {
    return {
      vi: table.viTitle,
      en: table.enTitle,
    };
  }

  return {
    vi: tableName,
    en: tableName,
  };
}

function getTableStatusCopy(status: string) {
  if (status === "Open") {
    return {
      vi: "Mở",
      en: "Open",
    };
  }

  if (status === "Quiet") {
    return {
      vi: "Yên",
      en: "Quiet",
    };
  }

  if (status === "Listening") {
    return {
      vi: "Đang nghe",
      en: "Listening",
    };
  }

  return {
    vi: "Rôm rả",
    en: "Lively",
  };
}

function getTableStatusHeading(status: string) {
  const statusCopy = getTableStatusCopy(status);

  if (status === "Lively") {
    return "BÀN ĐANG RÔM RẢ";
  }

  return `BÀN ${statusCopy.vi.toUpperCase()}`;
}

function getGossipAvatarCopy(avatarId: string) {
  return (
    GOSSIP_AVATAR_COPY[avatarId] ?? {
      name: getAvatarById(avatarId).name,
      description: getAvatarById(avatarId).description,
    }
  );
}

function getNicknameInitials(name: string) {
  const cleanedName = name.trim();

  if (!cleanedName) {
    return "?";
  }

  const words = cleanedName.split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? `${words[0]?.[0] ?? ""}${words[words.length - 1]?.[0] ?? ""}`
      : cleanedName.slice(0, 2);

  return initials.toUpperCase();
}

function readReportedFrontCounterMessageIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(
      localStorage.getItem(FRONT_COUNTER_REPORTED_MESSAGES_KEY) ?? "[]"
    );

    return Array.isArray(parsed)
      ? parsed.filter((messageId) => typeof messageId === "string")
      : [];
  } catch {
    return [];
  }
}

function rememberReportedFrontCounterMessageId(messageId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const messageIds = new Set(readReportedFrontCounterMessageIds());
  messageIds.add(messageId);
  localStorage.setItem(
    FRONT_COUNTER_REPORTED_MESSAGES_KEY,
    JSON.stringify([...messageIds])
  );
}
