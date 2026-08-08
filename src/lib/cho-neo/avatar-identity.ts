export type ChoNeoAvatar = {
  id: string;
  name: string;
  nameEn: string;
  nameVi: string;
  description: string;
  emoji?: string;
  src: string;
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

export const LEGACY_CHO_NEO_AVATAR_ID_MAP: Record<string, string> = {
  "auntie-owner": "salon-owner-female",
  "bubble-tea-tech": "nail-tech-male",
  "creative-soul": "color-queen",
  "female-salon-owner": "salon-owner-female",
  "front-counter-pro": "salon-owner-male",
  "golden-scissors": "color-queen",
  "gossip-auntie": "gossip-cafe-regular",
  "lucky-cat-friend": "gossip-cafe-regular",
  "male-salon-owner": "salon-owner-male",
  "market-runner": "style-lover",
  "nail-tech": "nail-tech-female",
  "nail-tech-guy": "nail-tech-male",
  "new-village-guest": "nail-tech-male",
  "ong-dia-buddy": "color-queen",
  "product-hunter": "color-queen",
  "quiet-listener": "gossip-cafe-regular",
  "salon-queen": "bling-bling-girl",
  "show-off-gay": "style-lover",
  "uncle-coffee": "gossip-cafe-regular",
  "weekend-warrior": "style-lover",
  "young-nail-tech": "nail-tech-female",
};

export const CHO_NEO_AVATARS: ChoNeoAvatar[] = [
  {
    id: "nail-tech-female",
    name: "Female Nail Tech",
    nameEn: "Female Nail Tech",
    nameVi: "Thợ Nail Nữ",
    description: "Tay nghề chắc. Biết chuyện dưới sàn tiệm.",
    emoji: "💅",
    src: "/images/cho-neo/avatars/nail-tech-girl.png",
    tone: "cyan",
  },
  {
    id: "nail-tech-male",
    name: "Male Nail Tech",
    nameEn: "Male Nail Tech",
    nameVi: "Thợ Nail Nam",
    description: "Vững tay nghề. Nhìn nhanh chuyện trong tiệm.",
    emoji: "🏮",
    src: "/images/cho-neo/avatars/nail-tech-guy.png",
    tone: "slate",
  },
  {
    id: "salon-owner-female",
    name: "Female Salon Owner",
    nameEn: "Female Salon Owner",
    nameVi: "Chủ Tiệm Nữ",
    description: "Dẫn dắt bằng tình. Quán xuyến cả tiệm.",
    emoji: "🧾",
    src: "/images/cho-neo/avatars/salon-owner-female.png",
    tone: "rose",
  },
  {
    id: "salon-owner-male",
    name: "Male Salon Owner",
    nameEn: "Male Salon Owner",
    nameVi: "Chủ Tiệm Nam",
    description: "Đầu óc kinh doanh. Góp ý thực tế. Tìm được đường ra.",
    emoji: "🧠",
    src: "/images/cho-neo/avatars/salon-owner-male.png",
    tone: "blue",
  },
  {
    id: "gossip-cafe-regular",
    name: "Gossip Café Regular",
    nameEn: "Gossip Café Regular",
    nameVi: "Khách Quen Quán Tám",
    description: "Ấm áp. Hay trò chuyện. Luôn quanh bàn.",
    emoji: "🫖",
    src: "/images/cho-neo/avatars/gossip-cafe-regular.png",
    tone: "rose",
  },
  {
    id: "style-lover",
    name: "Style Lover",
    nameEn: "Style Lover",
    nameVi: "Người Có Gu",
    description: "Tự tin. Thích thắng. Khoe hành trình.",
    emoji: "🏆",
    src: "/images/cho-neo/avatars/show-off-guy.png",
    tone: "gold",
  },
  {
    id: "bling-bling-girl",
    name: "Bling-Bling Girl",
    nameEn: "Bling-Bling Girl",
    nameVi: "Cô Lấp Lánh",
    description: "Lấp lánh. Đẹp. Thích nổi bật.",
    emoji: "✨",
    src: "/images/cho-neo/avatars/bling-bling-girl.png",
    tone: "violet",
  },
  {
    id: "color-queen",
    name: "Color Queen",
    nameEn: "Color Queen",
    nameVi: "Nữ Hoàng Màu",
    description: "Mê màu, phối màu, thiết kế. Chi tiết là chuyện lớn.",
    emoji: "🎨",
    src: "/images/cho-neo/avatars/creative-soul.png",
    tone: "gold",
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
  const resolvedAvatarId = resolveChoNeoAvatarId(avatarId);
  return (
    CHO_NEO_AVATARS.find((avatar) => avatar.id === resolvedAvatarId) ??
    CHO_NEO_AVATARS[0]
  );
}

export function isChoNeoAvatarId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (CHO_NEO_AVATARS.some((avatar) => avatar.id === value) ||
      Object.prototype.hasOwnProperty.call(LEGACY_CHO_NEO_AVATAR_ID_MAP, value))
  );
}

export function resolveChoNeoAvatarId(avatarId: string | undefined) {
  if (!avatarId) {
    return CHO_NEO_AVATARS[0].id;
  }

  if (CHO_NEO_AVATARS.some((avatar) => avatar.id === avatarId)) {
    return avatarId;
  }

  return LEGACY_CHO_NEO_AVATAR_ID_MAP[avatarId] ?? CHO_NEO_AVATARS[0].id;
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

  const avatarId = resolveChoNeoAvatarId(parsed.avatarId);

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

  const avatarId = resolveChoNeoAvatarId(input.avatarId);
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
      avatarSrc: getAvatarById(avatarId).src,
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
