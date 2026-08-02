import type { CSSProperties } from "react";

export const KHOE_SET_CATEGORIES = [
  "Mới nhất",
  "Khách mê",
  "Màu đẹp",
  "Xu hướng",
  "Ý tưởng",
] as const;

export type KhoeSetCategory = (typeof KHOE_SET_CATEGORIES)[number];

export type KhoeSetPost = {
  id: string;
  category: KhoeSetCategory;
  caption: string;
  imageDataUrl?: string;
  createdAt: string;
  creatorName: string;
  creatorAvatar?: string;
  styleTags: string[];
};

export type RoomArtworkConfig = {
  src: string;
  alt: string;
  objectPosition: string;
  aspectRatio: string;
  caption?: string;
  attribution?: string;
};

export type KhoeSetFrameStyle = CSSProperties & Record<`--${string}`, string>;
