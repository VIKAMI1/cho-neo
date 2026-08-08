import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const avatarIdentity = readFileSync("src/lib/cho-neo/avatar-identity.ts", "utf8");
const memberIdentity = readFileSync("src/lib/cho-neo/member-identity.ts", "utf8");
const memberProvider = readFileSync(
  "src/components/cho-neo/ChoNeoMemberProvider.tsx",
  "utf8",
);
const memberHeader = readFileSync(
  "src/components/cho-neo/ChoNeoMemberHeaderControl.tsx",
  "utf8",
);
const avatarPage = readFileSync("src/app/cho-neo/avatar/page.tsx", "utf8");
const joinPage = readFileSync("src/app/join/JoinClient.tsx", "utf8");
const authCallback = readFileSync(
  "src/app/auth/callback/AuthCallbackClient.tsx",
  "utf8",
);
const gossipPage = readFileSync("src/app/cho-neo/gossip/page.tsx", "utf8");
const gossipIdentity = readFileSync(
  "src/lib/cho-neo/gossip-front-counter.ts",
  "utf8",
);

const canonicalAvatars = [
  {
    id: "nail-tech-female",
    nameEn: "Female Nail Tech",
    nameVi: "Thợ Nail Nữ",
    src: "/images/cho-neo/avatars/nail-tech-girl.png",
  },
  {
    id: "nail-tech-male",
    nameEn: "Male Nail Tech",
    nameVi: "Thợ Nail Nam",
    src: "/images/cho-neo/avatars/nail-tech-guy.png",
  },
  {
    id: "salon-owner-female",
    nameEn: "Female Salon Owner",
    nameVi: "Chủ Tiệm Nữ",
    src: "/images/cho-neo/avatars/salon-owner-female.png",
  },
  {
    id: "salon-owner-male",
    nameEn: "Male Salon Owner",
    nameVi: "Chủ Tiệm Nam",
    src: "/images/cho-neo/avatars/salon-owner-male.png",
  },
  {
    id: "gossip-cafe-regular",
    nameEn: "Gossip Café Regular",
    nameVi: "Khách Quen Quán Tám",
    src: "/images/cho-neo/avatars/gossip-cafe-regular.png",
  },
  {
    id: "style-lover",
    nameEn: "Style Lover",
    nameVi: "Người Có Gu",
    src: "/images/cho-neo/avatars/show-off-guy.png",
  },
  {
    id: "bling-bling-girl",
    nameEn: "Bling-Bling Girl",
    nameVi: "Cô Lấp Lánh",
    src: "/images/cho-neo/avatars/bling-bling-girl.png",
  },
  {
    id: "color-queen",
    nameEn: "Color Queen",
    nameVi: "Nữ Hoàng Màu",
    src: "/images/cho-neo/avatars/creative-soul.png",
  },
];

function sourceBlock(source, startNeedle, endNeedle) {
  return source.slice(source.indexOf(startNeedle), source.indexOf(endNeedle));
}

test("the canonical catalogue carries portrait and bilingual identity metadata", () => {
  assert.match(avatarIdentity, /export type ChoNeoAvatar = \{/);
  assert.match(avatarIdentity, /nameEn: string;/);
  assert.match(avatarIdentity, /nameVi: string;/);
  assert.match(avatarIdentity, /src: string;/);
  assert.match(avatarIdentity, /emoji\?: string;/);
  assert.match(avatarIdentity, /tone: string;/);

  const catalogue = sourceBlock(
    avatarIdentity,
    "export const CHO_NEO_AVATARS",
    "const nicknameSuggestions",
  );
  assert.equal((catalogue.match(/\n    id: /g) ?? []).length, 8);
  assert.equal((catalogue.match(/\n    nameVi: /g) ?? []).length, 8);
  assert.equal((catalogue.match(/\n    nameEn: /g) ?? []).length, 8);
  assert.equal((catalogue.match(/\n    src: /g) ?? []).length, 8);

  const ids = [...catalogue.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, canonicalAvatars.map((avatar) => avatar.id));

  for (const avatar of canonicalAvatars) {
    assert.match(catalogue, new RegExp(`id: "${avatar.id}"[\\s\\S]*nameEn: "${avatar.nameEn}"[\\s\\S]*nameVi: "${avatar.nameVi}"[\\s\\S]*src: "${avatar.src}"`));
  }

  for (const removedName of [
    "Quiet Listener",
    "Lucky Seeker",
    "Waterfront Thinker",
    "Radio Listener",
    "Tool Hunter",
    "Night Owl",
    "Tea Table Friend",
    "Young Apprentice",
    "Problem Solver",
  ]) {
    assert.doesNotMatch(catalogue, new RegExp(removedName));
  }

  assert.match(avatarIdentity, /LEGACY_CHO_NEO_AVATAR_ID_MAP/);
  assert.match(avatarIdentity, /export function resolveChoNeoAvatarId/);
});

test("legacy avatar ids normalize before profile persistence and local reads", () => {
  const legacyMap = sourceBlock(
    avatarIdentity,
    "export const LEGACY_CHO_NEO_AVATAR_ID_MAP",
    "export const CHO_NEO_AVATARS",
  );
  for (const [legacyId, canonicalId] of Object.entries({
    "young-nail-tech": "nail-tech-female",
    "nail-tech": "nail-tech-female",
    "nail-tech-guy": "nail-tech-male",
    "new-village-guest": "nail-tech-male",
    "auntie-owner": "salon-owner-female",
    "female-salon-owner": "salon-owner-female",
    "male-salon-owner": "salon-owner-male",
    "front-counter-pro": "salon-owner-male",
    "gossip-auntie": "gossip-cafe-regular",
    "quiet-listener": "gossip-cafe-regular",
    "uncle-coffee": "gossip-cafe-regular",
    "lucky-cat-friend": "gossip-cafe-regular",
    "weekend-warrior": "style-lover",
    "show-off-gay": "style-lover",
    "market-runner": "style-lover",
    "salon-queen": "bling-bling-girl",
    "golden-scissors": "color-queen",
    "creative-soul": "color-queen",
    "ong-dia-buddy": "color-queen",
    "product-hunter": "color-queen",
    "bubble-tea-tech": "nail-tech-male",
  })) {
    assert.match(legacyMap, new RegExp(`"${legacyId}": "${canonicalId}"`));
  }

  assert.match(memberIdentity, /LEGACY_CHO_NEO_AVATAR_ID_MAP/);
  assert.match(memberIdentity, /resolveChoNeoAvatarId\(value\)/);
  assert.match(avatarPage, /resolveChoNeoAvatarId\(parsedProfile\.avatarId\)/);
  assert.match(avatarPage, /resolveChoNeoAvatarId\(/);
  assert.match(gossipIdentity, /isChoNeoAvatarId\(candidate\.avatarId\)/);
});

test("member profile and onboarding use canonical portrait choices", () => {
  assert.match(memberProvider, /saveMemberProfile: \(input:/);
  assert.match(memberProvider, /avatar_key: resolveChoNeoMemberAvatarKey\(input\.avatarKey\)/);
  assert.match(memberProvider, /CHO_NEO_AVATARS\.map\(\(avatar\) =>/);
  assert.doesNotMatch(memberProvider, /CHO_NEO_AVATARS\.slice\(0, 8\)/);
  assert.match(memberProvider, /src=\{avatar\.src\}/);
  assert.doesNotMatch(memberProvider, /\{avatar\.emoji\}/);
  assert.match(joinPage, /CHO_NEO_AVATARS\.map\(\(avatar\) =>/);
  assert.doesNotMatch(joinPage, /CHO_NEO_AVATARS\.slice\(0, 8\)/);
  assert.match(joinPage, /src=\{avatar\.src\}/);
  assert.doesNotMatch(joinPage, /\{avatar\.emoji\}/);
  assert.match(memberHeader, /src=\{profile\.avatar\.src\}/);
});

test("the avatar route saves verified-member choices through the provider", () => {
  assert.match(avatarPage, /const \{ profile, saveMemberProfile \} = useChoNeoMember\(\)/);
  assert.match(avatarPage, /isVerifiedChoNeoMemberProfile\(profile\)/);
  assert.match(avatarPage, /await saveMemberProfile\(/);
  assert.match(avatarPage, /avatarKey: selectedAvatar\.id/);
  assert.match(avatarPage, /CHO_NEO_AVATARS\.map/);
  assert.doesNotMatch(avatarPage, /const AVATARS:/);
});

test("the avatar route keeps final presentation compact and topbar-owned", () => {
  assert.match(avatarPage, /<Link href="\/cho-neo">Về Sân Làng<\/Link>/);
  assert.match(avatarPage, /className="cho-neo-shared-music-slot avatar-theme-audio"/);
  assert.match(avatarPage, /data-cho-neo-shared-music-slot/);
  assert.match(avatarPage, /font-size: clamp\(42px, 6vw, 64px\)/);
  assert.match(avatarPage, /\.avatar-topbar a \{[\s\S]*min-height: 44px/);
  assert.match(avatarPage, /\.avatar-theme-audio \{[\s\S]*width: 44px;[\s\S]*height: 44px;/);
  assert.match(avatarPage, /:global\(\.cho-neo-theme-audio \.theme-music-toggle\)/);
  assert.doesNotMatch(avatarPage, /font-weight: (?:8|9)\d\d/);
  assert.doesNotMatch(avatarPage, /letter-spacing: -/);
});

test("Quán Tám gives a verified member profile precedence over local avatar state", () => {
  assert.match(gossipPage, /const \{ ensureChoNeoMember, profile \} = useChoNeoMember\(\)/);
  assert.match(
    gossipPage,
    /if \(isVerifiedChoNeoMemberProfile\(profile\)\) \{[\s\S]*profile\.avatar[\s\S]*profile\.displayName/,
  );
  assert.match(gossipPage, /avatarSrc: memberAvatar\.src/);
  assert.match(gossipPage, /setAvatarProfile\(readStoredAvatarProfile\(\)\)/);
  assert.match(gossipPage, /src=\{currentAvatar\.src\}/);
  assert.match(gossipPage, /src=\{messageAvatar\.src\}/);
  assert.doesNotMatch(gossipPage, /\{messageAvatar\.emoji\}/);

  const seededMessages = sourceBlock(
    gossipPage,
    "const seededFrontCounterMessages",
    "const tables",
  );
  const avatarCopy = sourceBlock(
    gossipPage,
    "const GOSSIP_AVATAR_COPY",
    "function isChoNeoDaytime",
  );
  for (const avatar of canonicalAvatars) {
    assert.match(avatarCopy, new RegExp(`"${avatar.id}"`));
  }
  for (const oldId of [
    "young-nail-tech",
    "auntie-owner",
    "quiet-listener",
    "gossip-auntie",
    "weekend-warrior",
    "salon-queen",
    "ong-dia-buddy",
    "new-village-guest",
    "uncle-coffee",
    "bubble-tea-tech",
    "product-hunter",
    "market-runner",
    "golden-scissors",
    "lucky-cat-friend",
    "front-counter-pro",
  ]) {
    assert.doesNotMatch(seededMessages, new RegExp(`avatarId: "${oldId}"`));
    assert.doesNotMatch(avatarCopy, new RegExp(`"${oldId}":`));
  }
});

test("Google return preserves the server-backed Chợ Neo portrait identity", () => {
  assert.match(authCallback, /avatar_key/);
  assert.match(authCallback, /isApprovedChoNeoMemberAvatarKey\(data\.avatar_key\)/);
  assert.match(authCallback, /mapChoNeoMemberProfileRow\(data\)/);
  assert.match(authCallback, /profile\.userId !== session\.user\.id/);
  assert.match(authCallback, /profile\.avatarKey/);
  assert.match(memberIdentity, /const avatarKey = row\.avatar_key[\s\S]*resolveChoNeoMemberAvatarKey\(row\.avatar_key\)/);
  assert.match(memberIdentity, /avatar: getAvatarById\(avatarKey \?\? CHO_NEO_AVATARS\[0\]\.id\)/);
  assert.doesNotMatch(authCallback, /user_metadata|avatar_url|picture|updateUser/);
});
