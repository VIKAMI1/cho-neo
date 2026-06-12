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

export const CHO_NEO_IDENTITY_KEY = "choNeoIdentityV1";

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

export function getChoNeoIdentity(): ChoNeoIdentity | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(CHO_NEO_IDENTITY_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ChoNeoIdentity;
    const avatarExists = CHO_NEO_AVATARS.some(
      (avatar) => avatar.id === parsed.avatarId
    );

    if (
      !avatarExists ||
      !isValidVillageNickname(parsed.nickname).valid ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return {
      avatarId: parsed.avatarId,
      createdAt: parsed.createdAt,
      nickname: parsed.nickname.trim(),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function saveChoNeoIdentity(input: {
  avatarId: string;
  existingIdentity?: ChoNeoIdentity | null;
  nickname: string;
}) {
  if (typeof window === "undefined") {
    return null;
  }

  const avatarId = getAvatarById(input.avatarId).id;
  const nickname = input.nickname.trim();
  const validation = isValidVillageNickname(nickname);

  if (!validation.valid) {
    return null;
  }

  const now = new Date().toISOString();
  const identity: ChoNeoIdentity = {
    avatarId,
    nickname,
    createdAt: input.existingIdentity?.createdAt ?? now,
    updatedAt: now,
  };

  localStorage.setItem(CHO_NEO_IDENTITY_KEY, JSON.stringify(identity));

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
