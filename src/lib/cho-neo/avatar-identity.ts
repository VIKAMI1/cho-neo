export type ChoNeoAvatar = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  tone: string;
};

export type ChoNeoIdentity = {
  avatarId: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
};

type ChoNeoAvatarProfileStorage = {
  avatarId?: string;
  avatarSrc?: string;
  createdAt?: string;
  mood?: string;
  nickname?: string;
  updatedAt?: string;
};

export const CHO_NEO_IDENTITY_KEY = "choNeoAvatarProfile";

const CANONICAL_AVATAR_ID_MAP: Record<string, string> = {
  "bling-bling-girl": "salon-queen",
  "creative-soul": "golden-scissors",
  "female-salon-owner": "auntie-owner",
  "gossip-cafe-regular": "gossip-auntie",
  "male-salon-owner": "auntie-owner",
  "nail-tech": "young-nail-tech",
  "nail-tech-guy": "young-nail-tech",
  "show-off-gay": "weekend-warrior",
};

const AVATAR_PROFILE_SRC_BY_ID: Record<string, string> = {
  "auntie-owner": "/images/cho-neo/avatars/salon-owner-female.png",
  "front-counter-pro": "/images/cho-neo/avatars/salon-owner-male.png",
  "golden-scissors": "/images/cho-neo/avatars/creative-soul.png",
  "gossip-auntie": "/images/cho-neo/avatars/gossip-cafe-regular.png",
  "salon-queen": "/images/cho-neo/avatars/bling-bling-girl.png",
  "uncle-coffee": "/images/cho-neo/avatars/gossip-cafe-regular.png",
  "weekend-warrior": "/images/cho-neo/avatars/show-off-guy.png",
  "young-nail-tech": "/images/cho-neo/avatars/nail-tech-girl.png",
};

export const CHO_NEO_AVATARS: ChoNeoAvatar[] = [
  {
    id: "young-nail-tech",
    name: "Nail Tech",
    description: "Skilled hands. Shop-floor wisdom.",
    emoji: "💅",
    tone: "cyan",
  },
  {
    id: "auntie-owner",
    name: "Salon Owner",
    description: "Runs the show. Carries the weight.",
    emoji: "🧾",
    tone: "rose",
  },
  {
    id: "quiet-listener",
    name: "Quiet Listener",
    description: "Calm soul. Observes everything.",
    emoji: "🪑",
    tone: "blue",
  },
  {
    id: "gossip-auntie",
    name: "Gossip Café Regular",
    description: "Warm. Social. Always around the table.",
    emoji: "🫖",
    tone: "rose",
  },
  {
    id: "weekend-warrior",
    name: "Show-Off Guy",
    description: "Confident. Loves wins. Flexes the journey.",
    emoji: "🏆",
    tone: "gold",
  },
  {
    id: "salon-queen",
    name: "Bling-Bling Girl",
    description: "Glam. Sparkle. Beauty-forward.",
    emoji: "✨",
    tone: "violet",
  },
  {
    id: "ong-dia-buddy",
    name: "Lucky Seeker",
    description: "Xin xăm. Ông Địa believer. Hopeful heart.",
    emoji: "🍊",
    tone: "gold",
  },
  {
    id: "new-village-guest",
    name: "Young Apprentice",
    description: "New. Curious. Learning the trade.",
    emoji: "🏮",
    tone: "slate",
  },
  {
    id: "uncle-coffee",
    name: "Waterfront Thinker",
    description: "Reflective. Late-night mind. Needs quiet.",
    emoji: "☕",
    tone: "blue",
  },
  {
    id: "bubble-tea-tech",
    name: "Radio Listener",
    description: "Tuned in. Listens. Reacts. Village voice lover.",
    emoji: "📻",
    tone: "cyan",
  },
  {
    id: "product-hunter",
    name: "Tool Hunter",
    description: "Product geek. Always chasing the next best thing.",
    emoji: "🧴",
    tone: "green",
  },
  {
    id: "market-runner",
    name: "Night Owl",
    description: "After-hours talker. Closes the café.",
    emoji: "🌙",
    tone: "violet",
  },
  {
    id: "golden-scissors",
    name: "Color Queen",
    description: "Loves color. Match. Design. Details matter.",
    emoji: "🎨",
    tone: "gold",
  },
  {
    id: "lucky-cat-friend",
    name: "Tea Table Friend",
    description: "Brings calm. Good energy. Tea heals.",
    emoji: "🍵",
    tone: "green",
  },
  {
    id: "front-counter-pro",
    name: "Problem Solver",
    description: "Business brain. Gives advice. Finds solutions.",
    emoji: "🧠",
    tone: "blue",
  },
];

const nicknameSuggestions = [
  "Mai Calgary",
  "Tina London",
  "Anh Saigon",
  "Vy Studio",
  "Nhi Nails",
  "Bao Counter",
  "Linh Owner",
  "Kim Tech",
];

export function getAvatarById(avatarId: string) {
  return CHO_NEO_AVATARS.find((avatar) => avatar.id === avatarId) ?? CHO_NEO_AVATARS[0];
}

function resolveAvatarId(avatarId: string | undefined) {
  if (!avatarId) {
    return CHO_NEO_AVATARS[0].id;
  }

  if (CHO_NEO_AVATARS.some((avatar) => avatar.id === avatarId)) {
    return avatarId;
  }

  return CANONICAL_AVATAR_ID_MAP[avatarId] ?? CHO_NEO_AVATARS[0].id;
}

function getAvatarProfileSrc(avatarId: string) {
  return AVATAR_PROFILE_SRC_BY_ID[avatarId] ?? "/images/cho-neo/avatars/nail-tech-girl.png";
}

function readStoredAvatarProfile(): ChoNeoAvatarProfileStorage | null {
  const raw = localStorage.getItem(CHO_NEO_IDENTITY_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ChoNeoAvatarProfileStorage;
  } catch {
    return null;
  }
}

export function getChoNeoIdentity(): ChoNeoIdentity | null {
  if (typeof window === "undefined") {
    return null;
  }

  const parsed = readStoredAvatarProfile();

  if (
    !parsed ||
    typeof parsed.nickname !== "string" ||
    !isValidVillageNickname(parsed.nickname).valid ||
    typeof parsed.updatedAt !== "string"
  ) {
    return null;
  }

  const avatarId = resolveAvatarId(parsed.avatarId);

  return {
    avatarId,
    createdAt: parsed.createdAt ?? parsed.updatedAt,
    nickname: parsed.nickname.trim(),
    updatedAt: parsed.updatedAt,
  };
}

export function saveChoNeoIdentity(input: {
  avatarId: string;
  existingIdentity?: ChoNeoIdentity | null;
  nickname: string;
}) {
  if (typeof window === "undefined") {
    return null;
  }

  const avatarId = resolveAvatarId(input.avatarId);
  const nickname = input.nickname.trim();
  const validation = isValidVillageNickname(nickname);

  if (!validation.valid) {
    return null;
  }

  const now = new Date().toISOString();
  const storedProfile = readStoredAvatarProfile();
  const identity: ChoNeoIdentity = {
    avatarId,
    nickname,
    createdAt: input.existingIdentity?.createdAt ?? storedProfile?.createdAt ?? now,
    updatedAt: now,
  };

  localStorage.setItem(
    CHO_NEO_IDENTITY_KEY,
    JSON.stringify({
      avatarId,
      avatarSrc: getAvatarProfileSrc(avatarId),
      nickname,
      mood: storedProfile?.mood ?? "Muốn tám chút",
      updatedAt: now,
    })
  );

  return identity;
}

export function clearChoNeoIdentity() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(CHO_NEO_IDENTITY_KEY);
}

export function getRandomAvatar() {
  return CHO_NEO_AVATARS[Math.floor(Math.random() * CHO_NEO_AVATARS.length)];
}

export function getRandomNicknameSuggestion() {
  return nicknameSuggestions[Math.floor(Math.random() * nicknameSuggestions.length)];
}

export function isValidVillageNickname(nickname: string) {
  const trimmed = nickname.trim();

  if (!trimmed) {
    return { message: "Choose a village nickname first.", valid: false };
  }

  if (trimmed.length < 2) {
    return { message: "Use at least 2 characters.", valid: false };
  }

  if (trimmed.length > 24) {
    return { message: "Keep your village nickname under 24 characters.", valid: false };
  }

  return { message: "", valid: true };
}
