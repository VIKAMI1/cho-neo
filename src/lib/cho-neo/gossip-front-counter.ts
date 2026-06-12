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
    typeof candidate.createdAt === "string"
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
