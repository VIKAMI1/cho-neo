export type ChoNeoRoomStatus = "open" | "soon";

export type ChoNeoRoom = {
  id: string;
  viName: string;
  enName: string;
  href: string;
  icon: string;
  status: ChoNeoRoomStatus;
  viStatus: string;
  enStatus: string;
  viDescription: string;
  enDescription: string;
  tone: "cafe" | "shrine" | "gallery" | "owner" | "technique" | "waterfront" | "market";
  hotspot: {
    x: string;
    y: string;
    w: string;
    h: string;
  };
};

export const choNeoRooms: ChoNeoRoom[] = [
  {
    id: "gossip-cafe",
    viName: "Quán Tám",
    enName: "Gossip Café",
    href: "/cho-neo/gossip",
    icon: "☕",
    status: "open",
    viStatus: "Đang mở",
    enStatus: "Open",
    viDescription: "Bàn chuyện tiệm, hỏi nhanh, góp kinh nghiệm.",
    enDescription: "Shop talk, quick questions, useful village notes.",
    tone: "cafe",
    hotspot: { x: "60.6%", y: "22.8%", w: "8%", h: "8%" },
  },
  {
    id: "ong-dia-shrine",
    viName: "Bàn Ông Địa",
    enName: "Ong Dia Shrine",
    href: "/cho-neo/shrine",
    icon: "⛩",
    status: "open",
    viStatus: "Đang mở",
    enStatus: "Open",
    viDescription: "Xin lộc nhẹ, rút quẻ chậm, giữ vía cho ngày làm.",
    enDescription: "Gentle ritual, Xin Xăm, and daily grounding.",
    tone: "shrine",
    hotspot: { x: "28.4%", y: "21.2%", w: "8%", h: "8%" },
  },
  {
    id: "show-off-gallery",
    viName: "Khoe Set Đẹp",
    enName: "Show-Off Gallery",
    href: "/cho-neo/show-off",
    icon: "✦",
    status: "open",
    viStatus: "Đang mở",
    enStatus: "Open",
    viDescription: "Khoe bộ móng, góc tiệm, thành quả nhỏ trong ngày.",
    enDescription: "Fresh sets, shop corners, and small wins.",
    tone: "gallery",
    hotspot: { x: "20.4%", y: "45.6%", w: "8%", h: "8%" },
  },
  {
    id: "owner-corner",
    viName: "Góc Chủ Tiệm",
    enName: "Owner Corner",
    href: "/cho-neo/owner-corner",
    icon: "♕",
    status: "soon",
    viStatus: "Sắp mở",
    enStatus: "Coming soon",
    viDescription: "Giá, policy, nhân sự, booking, chuyện giữ tiệm bền.",
    enDescription: "Pricing, policies, staffing, and steady operations.",
    tone: "owner",
    hotspot: { x: "82.6%", y: "52.8%", w: "8%", h: "8%" },
  },
  {
    id: "technique-hall",
    viName: "Góc Thợ Nail",
    enName: "Nail Tech Corner",
    href: "/cho-neo/technique",
    icon: "▤",
    status: "soon",
    viStatus: "Sắp mở",
    enStatus: "Coming soon",
    viDescription: "Prep, retention, hình chụp, sản phẩm, chuyện tay nghề.",
    enDescription: "Prep, retention, photos, products, and nail tech craft.",
    tone: "technique",
    hotspot: { x: "72.4%", y: "46.2%", w: "8%", h: "8%" },
  },
  {
    id: "waterfront",
    viName: "Bến Nước",
    enName: "Waterfront",
    href: "/cho-neo/waterfront",
    icon: "≋",
    status: "soon",
    viStatus: "Sắp mở",
    enStatus: "Coming soon",
    viDescription: "Một chỗ chậm để thở sau giờ làm.",
    enDescription: "A calmer path for after-hours check-ins.",
    tone: "waterfront",
    hotspot: { x: "86.2%", y: "75.8%", w: "8%", h: "8%" },
  },
  {
    id: "market-street",
    viName: "Phố Chợ",
    enName: "Market Street",
    href: "/cho-neo/market",
    icon: "▣",
    status: "soon",
    viStatus: "Sắp mở",
    enStatus: "Coming soon",
    viDescription: "Supplier và mua bán để sau khi làng đủ tin nhau.",
    enDescription: "Commerce waits until trust feels real.",
    tone: "market",
    hotspot: { x: "45.6%", y: "70.8%", w: "8%", h: "8%" },
  },
];

export const openChoNeoRooms = choNeoRooms.filter((room) => room.status === "open");
export const soonChoNeoRooms = choNeoRooms.filter((room) => room.status === "soon");
