import {
  type ChoNeoIdentity,
  getAvatarById,
  isValidVillageNickname,
} from "./avatar-identity";

export type FrontCounterMessage = {
  id: string;
  avatarId: string;
  nickname: string;
  text: string;
  createdAt: string;
  hiddenAt?: string | null;
  removedAt?: string | null;
  reportCount?: number;
  reportedAt?: string | null;
  reactions?: {
    heart?: number;
    laugh?: number;
    tea?: number;
  };
};

export type FrontCounterSeat = {
  avatarId: string;
  nickname: string;
  seatedAt: string;
};

export type FrontCounterState = {
  messages: FrontCounterMessage[];
  seatedIdentity?: FrontCounterSeat;
};

export const CHO_NEO_GOSSIP_FRONT_COUNTER_KEY = "choNeoGossipFrontCounterV1";
export const FRONT_COUNTER_MESSAGE_CAP = 50;
export const FRONT_COUNTER_MESSAGE_TEXT_LIMIT = 180;
export const FRONT_COUNTER_MESSAGES_API =
  "/api/cho-neo/gossip/front-counter/messages";
const SUPABASE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createFrontCounterMessage(input: {
  identity: ChoNeoIdentity;
  text: string;
}): FrontCounterMessage {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    avatarId: input.identity.avatarId,
    createdAt: new Date().toISOString(),
    id,
    nickname: input.identity.nickname,
    reactions: { heart: 1 },
    text: input.text.trim(),
  };
}

export function createFrontCounterSeat(identity: ChoNeoIdentity): FrontCounterSeat {
  return {
    avatarId: identity.avatarId,
    nickname: identity.nickname,
    seatedAt: new Date().toISOString(),
  };
}

export function readFrontCounterState(): FrontCounterState {
  if (typeof window === "undefined") {
    return { messages: [] };
  }

  const raw = localStorage.getItem(CHO_NEO_GOSSIP_FRONT_COUNTER_KEY);

  if (!raw) {
    return { messages: [] };
  }

  try {
    const parsed = JSON.parse(raw) as FrontCounterState;
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.filter(isFrontCounterMessage).slice(-FRONT_COUNTER_MESSAGE_CAP)
      : [];
    const seatedIdentity = isFrontCounterSeat(parsed.seatedIdentity)
      ? parsed.seatedIdentity
      : undefined;

    return {
      messages,
      seatedIdentity,
    };
  } catch {
    return { messages: [] };
  }
}

export function saveFrontCounterState(state: FrontCounterState) {
  if (typeof window === "undefined") {
    return;
  }

  const nextState: FrontCounterState = {
    messages: state.messages.filter(isFrontCounterMessage).slice(-FRONT_COUNTER_MESSAGE_CAP),
    seatedIdentity: isFrontCounterSeat(state.seatedIdentity)
      ? state.seatedIdentity
      : undefined,
  };

  localStorage.setItem(CHO_NEO_GOSSIP_FRONT_COUNTER_KEY, JSON.stringify(nextState));
}

export function saveFrontCounterSeat(seatedIdentity: FrontCounterSeat) {
  const currentState = readFrontCounterState();

  saveFrontCounterState({
    messages: currentState.messages,
    seatedIdentity,
  });
}

export async function fetchSharedFrontCounterMessages() {
  const response = await fetch(FRONT_COUNTER_MESSAGES_API, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw await createSharedFrontCounterError(response, "fetch");
  }

  const payload = (await response.json()) as { messages?: unknown };

  return Array.isArray(payload.messages)
    ? payload.messages.filter(isFrontCounterMessage).slice(-FRONT_COUNTER_MESSAGE_CAP)
    : [];
}

export async function postSharedFrontCounterMessage(input: {
  avatarId: string;
  nickname: string;
  text: string;
}) {
  const response = await fetch(FRONT_COUNTER_MESSAGES_API, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw await createSharedFrontCounterError(response, "post");
  }

  const payload = (await response.json()) as { message?: unknown };

  if (!isFrontCounterMessage(payload.message)) {
    throw new Error("Shared Front Counter returned an invalid message.");
  }

  return payload.message;
}

export async function reportSharedFrontCounterMessage(messageId: string) {
  if (!isSharedFrontCounterMessageId(messageId)) {
    throw new Error("Shared Front Counter report requires a database message id.");
  }

  return updateSharedFrontCounterMessage({
    action: "report",
    messageId,
  });
}

export async function hideSharedFrontCounterMessage(input: {
  hostKey: string;
  messageId: string;
}) {
  if (!isSharedFrontCounterMessageId(input.messageId)) {
    throw new Error("Shared Front Counter hide requires a database message id.");
  }

  return updateSharedFrontCounterMessage({
    action: "hide",
    hostKey: input.hostKey,
    messageId: input.messageId,
  });
}

export async function removeSharedFrontCounterMessage(input: {
  hostKey: string;
  messageId: string;
}) {
  if (!isSharedFrontCounterMessageId(input.messageId)) {
    throw new Error("Shared Front Counter remove requires a database message id.");
  }

  return updateSharedFrontCounterMessage({
    action: "remove",
    hostKey: input.hostKey,
    messageId: input.messageId,
  });
}

async function updateSharedFrontCounterMessage(input: {
  action: "hide" | "remove" | "report";
  hostKey?: string;
  messageId: string;
}) {
  const response = await fetch(FRONT_COUNTER_MESSAGES_API, {
    body: JSON.stringify({
      action: input.action,
      messageId: input.messageId,
    }),
    headers: {
      "Content-Type": "application/json",
      ...(input.hostKey ? { "X-Cho-Neo-Host-Key": input.hostKey } : {}),
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw await createSharedFrontCounterError(response, input.action);
  }

  const payload = (await response.json()) as { message?: unknown };

  if (!isFrontCounterMessage(payload.message)) {
    throw new Error("Shared Front Counter returned an invalid moderation update.");
  }

  return payload.message;
}

export function isSharedFrontCounterMessageId(messageId: string) {
  return SUPABASE_UUID_PATTERN.test(messageId);
}

async function createSharedFrontCounterError(
  response: Response,
  operation: "fetch" | "hide" | "post" | "remove" | "report"
) {
  const payload = await response.json().catch(() => null);
  const reason =
    payload && typeof payload === "object" && "reason" in payload
      ? String(payload.reason)
      : response.statusText;
  const detail =
    payload && typeof payload === "object" && "detail" in payload
      ? String(payload.detail)
      : "No response detail.";

  if (process.env.NODE_ENV === "development") {
    console.warn("[cho-neo:gossip-front-counter]", {
      detail,
      operation,
      reason,
      status: response.status,
    });
  }

  return new Error(`Shared Front Counter ${operation} failed: ${reason}`);
}

function isFrontCounterMessage(message: unknown): message is FrontCounterMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as FrontCounterMessage;

  return (
    typeof candidate.id === "string" &&
    getAvatarById(candidate.avatarId).id === candidate.avatarId &&
    isValidVillageNickname(candidate.nickname).valid &&
    typeof candidate.text === "string" &&
    candidate.text.trim().length > 0 &&
    candidate.text.trim().length <= FRONT_COUNTER_MESSAGE_TEXT_LIMIT &&
    typeof candidate.createdAt === "string" &&
    (candidate.hiddenAt === undefined ||
      candidate.hiddenAt === null ||
      typeof candidate.hiddenAt === "string") &&
    (candidate.removedAt === undefined ||
      candidate.removedAt === null ||
      typeof candidate.removedAt === "string") &&
    (candidate.reportedAt === undefined ||
      candidate.reportedAt === null ||
      typeof candidate.reportedAt === "string") &&
    (candidate.reportCount === undefined ||
      (typeof candidate.reportCount === "number" &&
        Number.isFinite(candidate.reportCount) &&
        candidate.reportCount >= 0))
  );
}

function isFrontCounterSeat(seat: unknown): seat is FrontCounterSeat {
  if (!seat || typeof seat !== "object") {
    return false;
  }

  const candidate = seat as FrontCounterSeat;

  return (
    getAvatarById(candidate.avatarId).id === candidate.avatarId &&
    isValidVillageNickname(candidate.nickname).valid &&
    typeof candidate.seatedAt === "string"
  );
}
