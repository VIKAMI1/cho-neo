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
  "bling-bling-girl": "salon-queen",
  "creative-soul": "golden-scissors",
  "female-salon-owner": "auntie-owner",
  "gossip-cafe-regular": "gossip-auntie",
  "male-salon-owner": "auntie-owner",
  "nail-tech": "young-nail-tech",
  "nail-tech-guy": "young-nail-tech",
  "show-off-gay": "weekend-warrior",
};

export const CHO_NEO_AVATARS: ChoNeoAvatar[] = [
  {
    id: "young-nail-tech",
    name: "Nail Tech",
    nameEn: "Nail Tech",
    nameVi: "Thợ Nail",
    description: "Tay nghề chắc. Biết chuyện dưới sàn tiệm.",
    emoji: "💅",
    src: "/images/cho-neo/avatars/nail-tech-girl.png",
    tone: "cyan",
  },
  {
    id: "auntie-owner",
    name: "Female Salon Owner",
    nameEn: "Female Salon Owner",
    nameVi: "Chủ Tiệm Nữ",
    description: "Dẫn dắt bằng tình. Quán xuyến cả tiệm.",
    emoji: "🧾",
    src: "/images/cho-neo/avatars/salon-owner-female.png",
    tone: "rose",
  },
  {
    id: "quiet-listener",
    name: "Quiet Listener",
    nameEn: "Quiet Listener",
    nameVi: "Người Lắng Nghe",
    description: "Điềm tĩnh. Nhìn thấy nhiều chuyện.",
    emoji: "🪑",
    src: "/images/cho-neo/avatars/gossip-cafe-regular.png",
    tone: "blue",
  },
  {
    id: "gossip-auntie",
    name: "Gossip Café Regular",
    nameEn: "Gossip Café Regular",
    nameVi: "Khách Quen Quán Tám",
    description: "Ấm áp. Hay trò chuyện. Luôn quanh bàn.",
    emoji: "🫖",
    src: "/images/cho-neo/avatars/gossip-cafe-regular.png",
    tone: "rose",
  },
  {
    id: "weekend-warrior",
    name: "Show-Off Guy",
    nameEn: "Show-Off Guy",
    nameVi: "Người Có Gu",
    description: "Tự tin. Thích thắng. Khoe hành trình.",
    emoji: "🏆",
    src: "/images/cho-neo/avatars/show-off-guy.png",
    tone: "gold",
  },
  {
    id: "salon-queen",
    name: "Bling-Bling Girl",
    nameEn: "Bling-Bling Girl",
    nameVi: "Cô Lấp Lánh",
    description: "Lấp lánh. Đẹp. Thích nổi bật.",
    emoji: "✨",
    src: "/images/cho-neo/avatars/bling-bling-girl.png",
    tone: "violet",
  },
  {
    id: "ong-dia-buddy",
    name: "Lucky Seeker",
    nameEn: "Lucky Seeker",
    nameVi: "Người Tìm May",
    description: "Tin xin xăm, Ông Địa. Lòng còn hy vọng.",
    emoji: "🍊",
    src: "/images/cho-neo/avatars/creative-soul.png",
    tone: "gold",
  },
  {
    id: "new-village-guest",
    name: "Young Apprentice",
    nameEn: "Young Apprentice",
    nameVi: "Học Việc Trẻ",
    description: "Mới vào nghề. Tò mò. Đang học.",
    emoji: "🏮",
    src: "/images/cho-neo/avatars/nail-tech-guy.png",
    tone: "slate",
  },
  {
    id: "uncle-coffee",
    name: "Waterfront Thinker",
    nameEn: "Waterfront Thinker",
    nameVi: "Người Suy Nghĩ Bên Nước",
    description: "Hay nghĩ. Thức khuya. Cần yên tĩnh.",
    emoji: "☕",
    src: "/images/cho-neo/avatars/gossip-cafe-regular.png",
    tone: "blue",
  },
  {
    id: "bubble-tea-tech",
    name: "Radio Listener",
    nameEn: "Radio Listener",
    nameVi: "Người Nghe Radio",
    description: "Bắt sóng nhanh. Biết nghe. Biết phản ứng.",
    emoji: "📻",
    src: "/images/cho-neo/avatars/nail-tech-guy.png",
    tone: "cyan",
  },
  {
    id: "product-hunter",
    name: "Tool Hunter",
    nameEn: "Tool Hunter",
    nameVi: "Người Săn Dụng Cụ",
    description: "Mê sản phẩm. Luôn tìm món tốt tiếp theo.",
    emoji: "🧴",
    src: "/images/cho-neo/avatars/creative-soul.png",
    tone: "green",
  },
  {
    id: "market-runner",
    name: "Night Owl",
    nameEn: "Night Owl",
    nameVi: "Cú Đêm",
    description: "Hay nói sau giờ. Khép cửa quán sau cùng.",
    emoji: "🌙",
    src: "/images/cho-neo/avatars/show-off-guy.png",
    tone: "violet",
  },
  {
    id: "golden-scissors",
    name: "Color Queen",
    nameEn: "Color Queen",
    nameVi: "Nữ Hoàng Màu",
    description: "Mê màu, phối màu, thiết kế. Chi tiết là chuyện lớn.",
    emoji: "🎨",
    src: "/images/cho-neo/avatars/creative-soul.png",
    tone: "gold",
  },
  {
    id: "lucky-cat-friend",
    name: "Tea Table Friend",
    nameEn: "Tea Table Friend",
    nameVi: "Người Bạn Bàn Trà",
    description: "Mang sự dịu lại. Trà giúp lòng chậm hơn.",
    emoji: "🍵",
    src: "/images/cho-neo/avatars/gossip-cafe-regular.png",
    tone: "green",
  },
  {
    id: "front-counter-pro",
    name: "Problem Solver",
    nameEn: "Problem Solver",
    nameVi: "Người Giải Quyết",
    description: "Đầu óc kinh doanh. Góp ý thực tế. Tìm được đường ra.",
    emoji: "🧠",
    src: "/images/cho-neo/avatars/salon-owner-male.png",
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
