"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  CHO_NEO_AVATARS,
  type ChoNeoIdentity,
  getAvatarById,
  getChoNeoIdentity,
  getRandomAvatar,
  getRandomNicknameSuggestion,
  isValidVillageNickname,
  saveChoNeoIdentity,
} from "@/lib/cho-neo/avatar-identity";
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

type ConversationMessage = {
  name: string;
  text: string;
};

type FrontCounterMemoryMode = "local" | "shared";
type FrontCounterModerationAction =
  | "hide"
  | "markReviewed"
  | "remove"
  | "unhide";

const FRONT_COUNTER_MESSAGE_LIMIT = FRONT_COUNTER_MESSAGE_TEXT_LIMIT;
const FRONT_COUNTER_MIN_MEANINGFUL_CHARACTERS = 3;
const FRONT_COUNTER_REPORTED_MESSAGES_KEY =
  "choNeoGossipFrontCounterReportedMessagesV1";
const FRONT_COUNTER_TALK_EXAMPLES = [
  "Which top coat is behaving today",
  "Slow Tuesday walk-in rhythm",
  "Receipts, prices, and polite client notes",
  "Weather before booking the afternoon",
];

const seededFrontCounterMessages: FrontCounterMessage[] = [
  {
    avatarId: "auntie-owner",
    createdAt: "2026-06-01T17:00:00.000Z",
    id: "seed-front-counter-1",
    nickname: "Mai",
    reactions: { heart: 2, tea: 1 },
    text: "Chrome still sells, but clients ask price first now.",
  },
  {
    avatarId: "uncle-coffee",
    createdAt: "2026-06-01T17:03:00.000Z",
    id: "seed-front-counter-2",
    nickname: "Bao",
    reactions: { laugh: 1 },
    text: "Supply cost is not the only issue. Time is the killer.",
  },
  {
    avatarId: "young-nail-tech",
    createdAt: "2026-06-01T17:05:00.000Z",
    id: "seed-front-counter-3",
    nickname: "Vy",
    reactions: { heart: 1 },
    text: "In my shop, chrome is still strong for short sets.",
  },
  {
    avatarId: "front-counter-pro",
    createdAt: "2026-06-01T17:08:00.000Z",
    id: "seed-front-counter-4",
    nickname: "TN",
    reactions: { tea: 2 },
    text: "Receipts matter. People compare everything now.",
  },
];

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
  "Bàn chuyện tiệm, chia sẻ receipts, giúp nhau khôn hơn. / Talk shop, share receipts, and help each other leave smarter.",
  "Không spam bán hàng supplier. / No supplier spam.",
  "Không công kích cá nhân. / No personal attacks.",
  "Không câu chuyện chính trị hay chửi theo quốc gia. / No political baiting or national-label insults.",
  "Không lộ thông tin riêng của khách hoặc nhân viên. / No doxxing or exposing private client/staff details.",
  "Nói về sản phẩm khi có ích, không quảng cáo ồn ào. / Product talk is allowed when useful, not blasted like an ad.",
];

const hostTools = ["báo cáo / report", "ẩn / hide", "gỡ / remove"];

const GOSSIP_AVATAR_COPY: Record<
  string,
  { name: string; description: string }
> = {
  "young-nail-tech": {
    name: "Thợ nail",
    description: "Tay nghề chắc. Biết chuyện dưới sàn tiệm.",
  },
  "auntie-owner": {
    name: "Chủ tiệm",
    description: "Quán xuyến mọi thứ. Gánh nhiều việc.",
  },
  "quiet-listener": {
    name: "Người lắng nghe",
    description: "Điềm tĩnh. Nhìn thấy nhiều chuyện.",
  },
  "gossip-auntie": {
    name: "Khách quen Gossip Café",
    description: "Ấm áp. Hay trò chuyện. Luôn quanh bàn.",
  },
  "weekend-warrior": {
    name: "Anh khoe thành tích",
    description: "Tự tin. Thích thắng. Khoe hành trình.",
  },
  "salon-queen": {
    name: "Cô gái bling-bling",
    description: "Lấp lánh. Đẹp. Thích nổi bật.",
  },
  "ong-dia-buddy": {
    name: "Người tìm may",
    description: "Tin xin xăm, Ông Địa. Lòng còn hy vọng.",
  },
  "new-village-guest": {
    name: "Học việc trẻ",
    description: "Mới vào nghề. Tò mò. Đang học.",
  },
  "uncle-coffee": {
    name: "Người suy nghĩ bên nước",
    description: "Hay nghĩ. Thức khuya. Cần yên tĩnh.",
  },
  "bubble-tea-tech": {
    name: "Người nghe radio",
    description: "Bắt sóng nhanh. Biết nghe. Biết phản ứng.",
  },
  "product-hunter": {
    name: "Người săn đồ nghề",
    description: "Mê sản phẩm. Luôn tìm món tốt hơn.",
  },
  "market-runner": {
    name: "Cú đêm",
    description: "Hay nói chuyện sau giờ. Đóng quán muộn.",
  },
  "golden-scissors": {
    name: "Nữ hoàng màu",
    description: "Mê màu. Biết phối. Để ý từng chi tiết.",
  },
  "lucky-cat-friend": {
    name: "Bạn bàn trà",
    description: "Mang bình tĩnh. Năng lượng tốt. Trà chữa lành.",
  },
  "front-counter-pro": {
    name: "Người gỡ rối",
    description: "Đầu óc kinh doanh. Hay góp ý. Tìm cách giải quyết.",
  },
};

export default function ChoNeoGossipPage() {
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
  const [identityPickerOpen, setIdentityPickerOpen] = useState(false);
  const [identityAvatarId, setIdentityAvatarId] = useState(CHO_NEO_AVATARS[0].id);
  const [identityNicknameDraft, setIdentityNicknameDraft] = useState("");
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [reportedMessageIds, setReportedMessageIds] = useState<string[]>([]);
  const [moderationNotice, setModerationNotice] = useState<string | null>(null);
  const [moderationBusyMessageId, setModerationBusyMessageId] = useState<
    string | null
  >(null);
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
  const selectedTable = useMemo(
    () => tables.find((table) => table.name === selectedTableName) ?? null,
    [selectedTableName]
  );
  const isFrontCounter = selectedTable?.name === "Front Counter";
  const selectedMessages: Array<ConversationMessage | FrontCounterMessage> =
    isFrontCounter
      ? frontCounterMessages.filter(isVisibleFrontCounterMessage)
      : selectedTable?.messages ?? [];
  const remainingFrontCounterCharacters =
    FRONT_COUNTER_MESSAGE_LIMIT - frontCounterDraft.length;
  const frontCounterMeaningfulCharacters =
    getMeaningfulCharacterCount(frontCounterDraft);
  const canSubmitFrontCounterMessage =
    frontCounterDraft.trim().length > 0 &&
    frontCounterMeaningfulCharacters >= FRONT_COUNTER_MIN_MEANINGFUL_CHARACTERS &&
    !frontCounterPosting;
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
    const savedIdentity = getChoNeoIdentity();

    if (savedIdentity) {
      setIdentity(savedIdentity);
      setIdentityAvatarId(savedIdentity.avatarId);
      setIdentityNicknameDraft(savedIdentity.nickname);
    } else {
      setIdentityPickerOpen(true);
    }

    setHostToolsOpen(
      new URLSearchParams(window.location.search).get("hostTools") === "1"
    );
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

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFrontCounterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = frontCounterDraft.trim();

    if (!identity || !isCurrentIdentitySeated || frontCounterPosting) {
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

    setFrontCounterPosting(true);
    setFrontCounterPostNotice(null);

    if (frontCounterMemoryMode === "shared") {
      try {
        const savedMessage = await postSharedFrontCounterMessage({
          avatarId: identity.avatarId,
          nickname: identity.nickname,
          text,
        });

        if (process.env.NODE_ENV === "development") {
          console.info("[cho-neo:gossip-front-counter] POST returned message id", {
            messageId: savedMessage.id,
          });
        }

        const sharedMessages = await fetchSharedFrontCounterMessages();

        setFrontCounterMessages(sharedMessages);
        setSharedFetchedMessageIds(getSharedFrontCounterMessageIds(sharedMessages));
        setFrontCounterDraft("");
        setFrontCounterMemoryNotice(null);
        setFrontCounterPostNotice(
          "Đã đăng ở Quầy Trước. Cảm ơn bạn giữ câu chuyện có ích. / Posted at the Front Counter. Thanks for keeping it useful."
        );
        return;
      } catch {
        setFrontCounterMemoryMode("local");
        setSharedFetchedMessageIds([]);
        setFrontCounterMemoryNotice(
          "Shared village memory is unavailable right now, so this post is saved on this device."
        );
      } finally {
        setFrontCounterPosting(false);
      }
    }

    saveFrontCounterMessageLocally({ identity, text });
    setFrontCounterPosting(false);
  }

  function saveFrontCounterMessageLocally(input: {
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
    setFrontCounterDraft("");
    setFrontCounterPostNotice(
      "Đã đăng ở Quầy Trước. Cảm ơn bạn giữ câu chuyện có ích. / Posted at the Front Counter. Thanks for keeping it useful."
    );
  }

  async function reportFrontCounterMessage(message: FrontCounterMessage) {
    if (!identity) {
      setIdentityPickerOpen(true);
      setModerationNotice("Tạo danh tính làng trước khi báo cáo tin nhắn. / Create a village identity before reporting a message.");
      return;
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

    setModerationBusyMessageId(message.id);
    setModerationNotice(null);

    try {
      const updatedMessage =
        frontCounterMemoryMode === "shared"
          ? await reportSharedFrontCounterMessage(message.id)
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

  function saveIdentity() {
    const validation = isValidVillageNickname(identityNicknameDraft);

    if (!validation.valid) {
      setIdentityError(validation.message);
      return;
    }

    const savedIdentity = saveChoNeoIdentity({
      avatarId: identityAvatarId,
      existingIdentity: identity,
      nickname: identityNicknameDraft,
    });

    if (!savedIdentity) {
      setIdentityError("Choose a village nickname first.");
      return;
    }

    setIdentity(savedIdentity);
    setIdentityAvatarId(savedIdentity.avatarId);
    setIdentityNicknameDraft(savedIdentity.nickname);
    setIdentityPickerOpen(false);
    setIdentityError(null);
  }

  function surpriseIdentity() {
    const avatar = getRandomAvatar();
    setIdentityAvatarId(avatar.id);

    if (!identityNicknameDraft.trim()) {
      setIdentityNicknameDraft(getRandomNicknameSuggestion());
    }

    setIdentityError(null);
  }

  function takeFrontCounterSeat() {
    if (!identity) {
      setIdentityPickerOpen(true);
      return;
    }

    const nextSeat = createFrontCounterSeat(identity);
    setSeatedIdentity(nextSeat);
    saveFrontCounterSeat(nextSeat);
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

  return (
    <main className="cafe-page">
      <div className="room-glow" />
      <div className="floor-grid" />

      <section className="cafe-shell" aria-labelledby="gossip-title">
        <header className="cafe-hero">
          <div>
            <p className="eyebrow">Cho Neo Village</p>
            <h1 id="gossip-title">
              Quán Tám — 18 người trong quán
              <span>Gossip Café — 18 inside</span>
            </h1>
            <p className="subtitle">
              Chuyện tiệm nail, lời rỉ tai ngoài chợ, và câu chuyện của cộng
              đồng làm đẹp xa quê. Mọi người ghé từng bàn nhỏ, nói vừa đủ nghe,
              không cần la qua cả phòng.
              <span>
                Salon talk, market whispers, and stories from the diaspora
                beauty floor. People drift between small tables instead of
                shouting across one big room.
              </span>
            </p>
          </div>

          <Link className="back-link" href="/cho-neo">
            <span className="back-kicker">Cho Neo Village</span>
            <span>
              Về Sân Làng
              <small>Back to Village Square</small>
            </span>
          </Link>
        </header>

        <section className="identity-strip" aria-label="Cho Neo identity">
          {identity && currentAvatar ? (
            <div className="current-identity">
              <div className={`avatar-token avatar-${currentAvatar.tone}`} aria-hidden="true">
                <span>{currentAvatar.emoji}</span>
              </div>
              <div>
                <p className="eyebrow">
                  Danh tính làng
                  <span>Village Identity</span>
                </p>
                <strong>{identity.nickname}</strong>
                <span>
                  {getGossipAvatarCopy(currentAvatar.id).name}
                  <small>{currentAvatar.name}</small>
                </span>
              </div>
              <button type="button" onClick={() => setIdentityPickerOpen(true)}>
                Đổi avatar
                <span>Change avatar</span>
              </button>
            </div>
          ) : (
            <p className="identity-nudge">
              Tạo danh tính làng trước khi ngồi ở Quầy Trước.
              <span>Create a village identity before taking a seat at the Front Counter.</span>
            </p>
          )}

          {identityPickerOpen ? (
            <div className="identity-picker">
              <div className="identity-picker-heading">
                <div>
                  <p className="eyebrow">
                    Danh tính avatar V1
                    <span>Avatar Identity V1</span>
                  </p>
                  <h2>
                    Chọn gương mặt cà phê của bạn.
                    <span>Choose your café face.</span>
                  </h2>
                  <p>
                    Chỉ dùng avatar có sẵn. Không upload, không tự build, không mua sắm.
                    <span>Preset avatars only. No uploads, no custom builder, no shopping.</span>
                  </p>
                </div>
                {identity ? (
                  <button type="button" onClick={() => setIdentityPickerOpen(false)}>
                    Đổi sau
                    <span>Change later</span>
                  </button>
                ) : null}
              </div>

              <div className="avatar-grid">
                {CHO_NEO_AVATARS.map((avatar) => {
                  const avatarCopy = getGossipAvatarCopy(avatar.id);

                  return (
                    <button
                      className={`avatar-choice avatar-${avatar.tone} ${
                        identityAvatarId === avatar.id ? "avatar-choice-active" : ""
                      }`}
                      key={avatar.id}
                      onClick={() => {
                        setIdentityAvatarId(avatar.id);
                        setIdentityError(null);
                      }}
                      type="button"
                    >
                      <span>{avatar.emoji}</span>
                      <strong>
                        {avatarCopy.name}
                        <span>{avatar.name}</span>
                      </strong>
                      <small>
                        {avatarCopy.description}
                        <span>{avatar.description}</span>
                      </small>
                    </button>
                  );
                })}
              </div>

              <div className="identity-form">
                <label htmlFor="gossip-village-nickname">
                  Tên trong làng
                  <span>Village nickname</span>
                </label>
                <input
                  id="gossip-village-nickname"
                  maxLength={24}
                  onChange={(event) => {
                    setIdentityNicknameDraft(event.target.value);
                    setIdentityError(null);
                  }}
                  placeholder="Mai Calgary"
                  type="text"
                  value={identityNicknameDraft}
                />
                {identityError ? <p>{identityError}</p> : null}
                <div>
                  <button type="button" onClick={surpriseIdentity}>
                    Chọn thử cho tôi
                    <span>Surprise me</span>
                  </button>
                  <button type="button" onClick={saveIdentity}>
                    Lưu danh tính
                    <span>Save identity</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section
          className={`room-scene ${selectedTable ? "room-scene-focused" : ""}`}
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

              <div className="detail-panel">
                <div className="detail-heading">
                  <div>
                    <p>
                      {getTableStatusHeading(selectedTable.status)}
                      <span>{getTableStatusCopy(selectedTable.status).en} Table</span>
                    </p>
                    <h2>
                      {getTableNameCopy(selectedTable.name).vi}
                      <span>{getTableNameCopy(selectedTable.name).en}</span>
                    </h2>
                  </div>
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
                </div>

                <p className="topic">
                  Chủ đề: “{selectedTable.topic}”
                  <span>Topic</span>
                </p>

                <div className="member-row detail-members" aria-label={`${selectedTable.name} seated members`}>
                  {selectedTable.initials.map((initial) => (
                    <span key={initial}>{initial}</span>
                  ))}
                </div>

                {isFrontCounter && hostToolsOpen ? (
                  <div className="host-tools-panel">
                    <div>
                      <strong>Host Review</strong>
                      <p>
                        Review reported, hidden, and removed Front Counter
                        messages.
                      </p>
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
                    <div className="host-tools-actions">
                      <button
                        disabled={hostReviewLoading}
                        onClick={() => void loadHostReviewMessages()}
                        type="button"
                      >
                        {hostReviewLoading
                          ? "Opening..."
                          : hostReviewUnlocked
                            ? "Refresh"
                            : "Open review"}
                      </button>
                      {hostReviewUnlocked ? (
                        <button type="button" onClick={closeHostReview}>
                          Close Host Review
                        </button>
                      ) : null}
                    </div>
                    {hostReviewUnlocked ? (
                      <div className="host-review-content">
                        {hostReviewMessages.length ? (
                          <div className="host-review-list">
                            {hostReviewMessages.map((message) => {
                              const labels = getHostReviewLabels(message);
                              const isRemoved = !!message.removedAt;
                              const isHidden = !!message.hiddenAt;
                              const hasReports = (message.reportCount ?? 0) > 0;
                              const isBusy =
                                moderationBusyMessageId === message.id;

                              return (
                                <div
                                  className="host-review-card"
                                  key={message.id}
                                >
                                  <div>
                                    <small>{message.nickname}</small>
                                    <p>{message.text}</p>
                                  </div>
                                  <div className="host-review-labels">
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
                                    <div className="moderation-row">
                                      {!isRemoved && isHidden ? (
                                        <button
                                          disabled={isBusy}
                                          onClick={() =>
                                            moderateFrontCounterMessage(
                                              "unhide",
                                              message
                                            )
                                          }
                                          type="button"
                                        >
                                          Unhide
                                        </button>
                                      ) : null}
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
                                          Hide
                                        </button>
                                      ) : null}
                                      {hasReports ? (
                                        <button
                                          disabled={isBusy}
                                          onClick={() =>
                                            moderateFrontCounterMessage(
                                              "markReviewed",
                                              message
                                            )
                                          }
                                          type="button"
                                        >
                                          Mark reviewed
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
                                          Remove
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p>No village host issues right now.</p>
                        )}
                      </div>
                    ) : null}
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

                <div className="mock-thread" aria-label={`${selectedTable.name} sample conversation`}>
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
                          {frontCounterMessage ? (
                            <span className="thread-avatar" aria-hidden="true">
                              {getAvatarById(frontCounterMessage.avatarId).emoji}
                            </span>
                          ) : null}
                          <small>{displayName}</small>
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
                                {reportedByThisBrowser ? (
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
                                    Hide
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
                                    Remove
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
                  ) : null}
                </div>

                {isFrontCounter ? (
                  <form
                    className="conversation-form"
                    onSubmit={handleFrontCounterSubmit}
                  >
                    <p className="prototype-note">
                      {frontCounterMemoryMode === "shared"
                        ? "Bàn này nhớ câu chuyện của làng. / This table remembers the village conversation."
                        : "V1 này nhớ tin nhắn trên máy này. Bộ nhớ chung của làng sẽ đến sau. / This V1 remembers messages on this device. Shared village memory comes later."}
                    </p>
                    {frontCounterMemoryNotice ? (
                      <p className="memory-notice">{frontCounterMemoryNotice}</p>
                    ) : null}
                    <div className="seat-stage" aria-label="Front Counter stools">
                      {visibleSeats.map((seat) => {
                        const avatar = getAvatarById(seat.avatarId);
                        const isCurrentSeat =
                          identity?.nickname === seat.nickname &&
                          identity?.avatarId === seat.avatarId;

                        return (
                          <div
                            className={`seat-person ${
                              isCurrentSeat ? "seat-person-current" : ""
                            }`}
                            key={`${seat.avatarId}-${seat.nickname}`}
                          >
                            <div className={`avatar-token avatar-${avatar.tone}`}>
                              <span>{avatar.emoji}</span>
                            </div>
                            <strong>{seat.nickname}</strong>
                            <span>
                              ghế
                              <small>stool</small>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {identity ? (
                      isCurrentIdentitySeated ? (
                        <p className="posting-as">
                          Đang ngồi với tên <strong>{identity.nickname}</strong>
                          <span>Seated as {identity.nickname}</span>
                        </p>
                      ) : (
                        <button
                          className="take-seat-button"
                          type="button"
                          onClick={takeFrontCounterSeat}
                        >
                          Ngồi xuống
                          <span>Take a seat</span>
                        </button>
                      )
                    ) : (
                      <div className="identity-needed">
                        <strong>
                          Tạo danh tính làng trước.
                          <span>Create your village identity first.</span>
                        </strong>
                        <p>
                          Chọn avatar và tên trước khi vào Quầy Trước.
                          <span>Pick an avatar and nickname before joining the Front Counter.</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setIdentityPickerOpen(true)}
                        >
                          Tạo danh tính
                          <span>Create identity</span>
                        </button>
                      </div>
                    )}
                    <label htmlFor="front-counter-message">
                      ĐỂ LẠI MỘT GHI CHÚ Ở QUẦY TRƯỚC
                      <span>Leave a Front Counter Note</span>
                    </label>
                    <p className="posting-helper">
                      Share one short village note: shop rhythm, product
                      receipts, price checks, booking weather, or a useful
                      observation from the day.
                    </p>
                    <div className="message-row">
                      <input
                        disabled={
                          !identity ||
                          !isCurrentIdentitySeated ||
                          frontCounterPosting
                        }
                        id="front-counter-message"
                        maxLength={FRONT_COUNTER_MESSAGE_LIMIT}
                        onChange={(event) => {
                          setFrontCounterDraft(event.target.value);
                          setFrontCounterPostNotice(null);
                        }}
                        placeholder={
                          identity && isCurrentIdentitySeated
                            ? "Gửi một ghi chú tiệm nhanh cho làng..."
                            : "Ngồi xuống để đăng..."
                        }
                        type="text"
                        value={frontCounterDraft}
                      />
                      <button
                        disabled={
                          !identity ||
                          !isCurrentIdentitySeated ||
                          !canSubmitFrontCounterMessage ||
                          frontCounterPosting
                        }
                        type="submit"
                      >
                        {frontCounterPosting ? (
                          <>
                            Đang đăng...
                            <span>Posting...</span>
                          </>
                        ) : (
                          <>
                            Đăng
                            <span>Post</span>
                          </>
                        )}
                      </button>
                    </div>
                    {frontCounterPostNotice ? (
                      <p className="post-feedback">{frontCounterPostNotice}</p>
                    ) : null}
                    <p className="character-count">
                      Còn {remainingFrontCounterCharacters} /{" "}
                      {FRONT_COUNTER_MESSAGE_LIMIT} ký tự. Tối thiểu{" "}
                      {FRONT_COUNTER_MIN_MEANINGFUL_CHARACTERS} ký tự có nghĩa.
                      <span>
                        {remainingFrontCounterCharacters} of{" "}
                        {FRONT_COUNTER_MESSAGE_LIMIT} characters left. Minimum{" "}
                        {FRONT_COUNTER_MIN_MEANINGFUL_CHARACTERS} meaningful
                        characters.
                      </span>
                    </p>
                  </form>
                ) : null}

                <button
                  className="leave-button"
                  type="button"
                  onClick={() => setSelectedTableName(null)}
                >
                  Về tất cả bàn
                  <span>Back to all tables</span>
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
                        <p>
                          {getTableActionCopy(table.action).vi.toUpperCase()}
                          <span>{getTableActionCopy(table.action).en}</span>
                        </p>
                        <h2>
                          {getTableNameCopy(table.name).vi}
                          <span>{getTableNameCopy(table.name).en}</span>
                        </h2>
                      </div>
                      <span>
                        {getTableStatusCopy(table.status).vi}
                        <small>{getTableStatusCopy(table.status).en}</small>
                      </span>
                    </div>

                    <p className="topic">
                      Chủ đề: “{table.topic}”
                      <span>Topic</span>
                    </p>
                    <p className="note">{table.note}</p>

                    <div className="member-row" aria-label={`${table.name} members`}>
                      {table.initials.map((initial) => (
                        <span key={initial}>{initial}</span>
                      ))}
                    </div>

                    <div className="table-footer">
                      <strong>
                        {table.count} {getTableActionCopy(table.action).vi}
                        <span>
                          {table.count} {getTableActionCopy(table.action).en}
                        </span>
                      </strong>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTable(table.name);
                        }}
                      >
                        Vào bàn
                        <span>Join table</span>
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
            <p className="eyebrow">
              Luật trong quán
              <span>House Rules</span>
            </p>
            <h2>
              Cách ngồi bàn
              <span>Table Etiquette</span>
            </h2>
            <p>
              Quán ấm, ranh giới rõ. Gossip Café vui khi câu chuyện có ích,
              vui nhẹ, hoặc tử tế.
              <span>
                Warm room, sharp boundaries. Gossip Café works when the talk
                stays useful, funny, or kind.
              </span>
            </p>
          </div>
          <div className="rules-body">
            <ul>
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <div className="host-note">
              <strong>
                Dụng cụ host của làng
                <span>Village host tools</span>
              </strong>
              <p>
                Ai cũng có thể báo cáo. Ẩn và Gỡ chỉ dành cho host.
                <span>Report is available to everyone. Hide and Remove are host-only.</span>
              </p>
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

        .eyebrow span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: none;
        }

        h1 {
          margin: 0;
          font-size: clamp(42px, 7.6vw, 86px);
          line-height: 0.9;
          letter-spacing: -0.045em;
          text-wrap: balance;
        }

        h1 span {
          display: block;
          margin-top: 8px;
          color: rgba(255, 247, 237, 0.68);
          font-size: 0.34em;
          line-height: 1.08;
          letter-spacing: 0;
        }

        .subtitle {
          max-width: 780px;
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.82);
          font-size: clamp(16px, 1.8vw, 21px);
          line-height: 1.5;
        }

        .subtitle span {
          display: block;
          margin-top: 8px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 0.88em;
          line-height: 1.45;
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

        .back-link small,
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
          font-weight: 850;
          line-height: 1.25;
          letter-spacing: 0;
          opacity: 0.68;
          text-transform: none;
        }

        .identity-strip {
          display: grid;
          gap: 12px;
          margin-top: 18px;
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
          grid-template-columns: auto minmax(0, 1fr) auto;
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
          border-radius: 22px;
          background: rgba(253, 230, 138, 0.12);
          box-shadow: 0 0 28px rgba(251, 191, 36, 0.12);
        }

        .avatar-token span {
          font-size: 30px;
        }

        .current-identity strong {
          display: block;
          color: #fff7ed;
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
          font-weight: 850;
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
          font-weight: 950;
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
          gap: 14px;
          padding: 16px;
        }

        .identity-picker-heading {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }

        .identity-picker h2 {
          margin: 0;
          font-size: clamp(28px, 4vw, 46px);
          line-height: 0.96;
          letter-spacing: -0.04em;
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
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .avatar-choice {
          display: grid;
          gap: 8px;
          place-items: center;
          min-height: 104px;
          padding: 12px 8px;
          color: #fff7ed !important;
          background: rgba(15, 23, 42, 0.62) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 18px !important;
        }

        .avatar-choice > span {
          font-size: 30px;
        }

        .avatar-choice strong {
          font-size: 12px;
          line-height: 1.15;
        }

        .avatar-choice strong span,
        .avatar-choice small span {
          display: block;
          margin-top: 2px;
          opacity: 0.68;
        }

        .avatar-choice small {
          color: rgba(255, 247, 237, 0.62);
          font-size: 11px;
          font-weight: 750;
          line-height: 1.25;
        }

        .avatar-choice-active {
          border-color: rgba(253, 230, 138, 0.58) !important;
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.16);
        }

        .identity-form {
          display: grid;
          gap: 9px;
        }

        .identity-form label {
          color: #fde68a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.14em;
          line-height: 1.35;
          text-transform: none;
        }

        .identity-form input {
          min-height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          padding: 0 14px;
          color: #fff7ed;
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
          font-weight: 850;
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
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: pre-line;
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

        .detail-heading p span,
        .table-heading p span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 10px;
          letter-spacing: 0.12em;
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
          font-weight: 950;
        }

        .detail-heading strong span,
        .table-footer strong span {
          display: block;
          margin-top: 2px;
          font-size: 10px;
          font-weight: 900;
          opacity: 0.68;
        }

        .detail-members {
          margin-top: 18px;
        }

        .mock-thread {
          display: grid;
          gap: 12px;
          margin-top: 20px;
        }

        .daily-table-talk {
          display: grid;
          gap: 8px;
          margin-top: 18px;
          padding: 14px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(253, 230, 138, 0.12), rgba(255, 247, 237, 0.055)),
            rgba(8, 13, 28, 0.34);
        }

        .daily-table-talk p {
          margin: 0;
          color: #fde68a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .daily-table-talk p span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        .daily-table-talk strong {
          max-width: 760px;
          color: #fff7ed;
          font-size: 17px;
          line-height: 1.28;
        }

        .daily-table-talk strong span {
          display: block;
          margin-top: 5px;
          color: rgba(255, 247, 237, 0.66);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.35;
        }

        .daily-table-talk > span {
          color: rgba(255, 247, 237, 0.68);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.4;
        }

        .daily-table-talk > span small {
          display: block;
          margin-top: 5px;
          color: rgba(255, 247, 237, 0.56);
          font-size: 12px;
          line-height: 1.4;
        }

        .front-counter-atmosphere {
          display: grid;
          gap: 10px;
          margin-top: 18px;
          padding: 13px 14px;
          border: 1px solid rgba(253, 230, 138, 0.16);
          border-radius: 18px;
          background:
            radial-gradient(circle at 10% 0%, rgba(253, 230, 138, 0.12), transparent 34%),
            rgba(255, 247, 237, 0.07);
        }

        .front-counter-atmosphere strong,
        .front-counter-empty-state strong {
          color: #fde68a;
          font-size: 13px;
          font-weight: 950;
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
          padding: 6px 9px;
          color: rgba(255, 247, 237, 0.76);
          background: rgba(8, 13, 28, 0.28);
          font-size: 12px;
          font-weight: 850;
        }

        .front-counter-atmosphere p,
        .front-counter-empty-state p {
          margin: 0;
          color: rgba(255, 247, 237, 0.68);
          font-size: 13px;
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
          color: #fde68a;
          font-size: 13px;
          font-weight: 950;
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
          color: #fff7ed;
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
          font-weight: 950;
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
          font-weight: 850;
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
          color: #fde68a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.06em;
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
          font-weight: 900;
        }

        .thread-message {
          position: relative;
          width: min(82%, 430px);
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 247, 237, 0.11);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
        }

        .thread-avatar {
          position: absolute;
          top: -9px;
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 999px;
          background: rgba(8, 13, 28, 0.82);
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
          background: rgba(253, 230, 138, 0.16);
          border-color: rgba(253, 230, 138, 0.18);
        }

        .thread-message-right .thread-avatar {
          right: -8px;
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

        .thread-message-removed {
          border-style: dashed;
          background: rgba(255, 255, 255, 0.07);
        }

        .thread-message-removed p {
          color: rgba(255, 247, 237, 0.62);
          font-style: italic;
        }

        .reaction-row {
          display: block;
          margin-top: 8px;
          color: rgba(253, 230, 138, 0.7);
          font-size: 11px;
          font-weight: 850;
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
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          padding: 0 9px;
          color: rgba(255, 247, 237, 0.76);
          background: rgba(8, 13, 28, 0.28);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.15;
        }

        .moderation-row button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .moderation-row span {
          color: rgba(253, 230, 138, 0.68);
          font-size: 11px;
          font-weight: 850;
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

        .memory-notice {
          margin: -2px 0 0;
          color: rgba(253, 230, 138, 0.74);
          font-size: 12px;
          font-weight: 850;
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
          color: #fff7ed;
          font-size: 12px;
          line-height: 1.1;
          text-align: center;
        }

        .seat-person > span {
          color: rgba(255, 247, 237, 0.55);
          font-size: 11px;
          font-weight: 850;
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
          font-weight: 950;
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
          color: #fde68a;
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
          font-weight: 950;
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
          line-height: 1.35;
          text-transform: none;
        }

        .conversation-form label span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        .posting-helper {
          margin: -3px 0 0;
          color: rgba(255, 247, 237, 0.66);
          font-size: 12px;
          line-height: 1.4;
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

        .post-feedback {
          margin: -2px 4px 0 0;
          color: rgba(253, 230, 138, 0.78);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.4;
        }

        .character-count {
          justify-self: end;
          margin: -2px 4px 0 0;
          color: rgba(255, 247, 237, 0.56);
          font-size: 12px;
          font-weight: 850;
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

        .table-heading > span small {
          display: block;
          margin-top: 1px;
          font-size: 9px;
          font-weight: 900;
          opacity: 0.68;
        }

        .topic {
          margin: 16px 0 0;
          color: #fff7ed;
          font-size: 15px;
          font-weight: 850;
          line-height: 1.35;
        }

        .topic span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.56);
          font-size: 12px;
          font-weight: 850;
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

        .host-note div span {
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

          .avatar-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .seat-stage {
            grid-template-columns: repeat(3, minmax(0, 1fr));
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

          .current-identity,
          .identity-picker-heading {
            display: grid;
            grid-template-columns: 1fr;
          }

          .current-identity button,
          .identity-picker-heading button,
          .identity-form div button {
            width: 100%;
          }

          .avatar-grid,
          .seat-stage {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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

          .host-tools-panel {
            grid-template-columns: 1fr;
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
      return "Message hidden from the Front Counter.";
    case "markReviewed":
      return "Message marked reviewed.";
    case "remove":
      return "Message replaced with a host removal notice.";
    case "unhide":
      return "Message returned to the Front Counter.";
  }
}

function getMeaningfulCharacterCount(value: string) {
  return value.replace(/\s/g, "").length;
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
  if (tableName === "Front Counter") {
    return {
      vi: "Quầy Trước",
      en: "Front Counter",
    };
  }

  if (tableName === "Corner Table") {
    return {
      vi: "Bàn Góc",
      en: "Corner Table",
    };
  }

  if (tableName === "Window Seat") {
    return {
      vi: "Ghế Cửa Sổ",
      en: "Window Seat",
    };
  }

  if (tableName === "Big Table") {
    return {
      vi: "Bàn Lớn",
      en: "Big Table",
    };
  }

  if (tableName === "Quiet Table") {
    return {
      vi: "Bàn Yên",
      en: "Quiet Table",
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
