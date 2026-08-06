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
const gossipPage = readFileSync("src/app/cho-neo/gossip/page.tsx", "utf8");
const gossipIdentity = readFileSync(
  "src/lib/cho-neo/gossip-front-counter.ts",
  "utf8",
);

test("the canonical catalogue carries portrait and bilingual identity metadata", () => {
  assert.match(avatarIdentity, /export type ChoNeoAvatar = \{/);
  assert.match(avatarIdentity, /nameEn: string;/);
  assert.match(avatarIdentity, /nameVi: string;/);
  assert.match(avatarIdentity, /src: string;/);
  assert.match(avatarIdentity, /emoji\?: string;/);
  assert.match(avatarIdentity, /tone: string;/);

  const catalogue = avatarIdentity.slice(
    avatarIdentity.indexOf("export const CHO_NEO_AVATARS"),
    avatarIdentity.indexOf("const nicknameSuggestions"),
  );
  assert.equal((catalogue.match(/\n    id: /g) ?? []).length, 15);
  assert.equal((catalogue.match(/\n    nameVi: /g) ?? []).length, 15);
  assert.equal((catalogue.match(/\n    nameEn: /g) ?? []).length, 15);
  assert.equal((catalogue.match(/\n    src: /g) ?? []).length, 15);
  assert.match(avatarIdentity, /LEGACY_CHO_NEO_AVATAR_ID_MAP/);
  assert.match(avatarIdentity, /export function resolveChoNeoAvatarId/);
});

test("legacy avatar ids normalize before profile persistence and local reads", () => {
  assert.match(memberIdentity, /LEGACY_CHO_NEO_AVATAR_ID_MAP/);
  assert.match(memberIdentity, /resolveChoNeoAvatarId\(value\)/);
  assert.match(avatarPage, /resolveChoNeoAvatarId\(parsedProfile\.avatarId\)/);
  assert.match(avatarPage, /resolveChoNeoAvatarId\(/);
  assert.match(gossipIdentity, /isChoNeoAvatarId\(candidate\.avatarId\)/);
});

test("member profile and onboarding use canonical portrait choices", () => {
  assert.match(memberProvider, /saveMemberProfile: \(input:/);
  assert.match(memberProvider, /avatar_key: resolveChoNeoMemberAvatarKey\(input\.avatarKey\)/);
  assert.match(memberProvider, /src=\{avatar\.src\}/);
  assert.doesNotMatch(memberProvider, /\{avatar\.emoji\}/);
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
});
