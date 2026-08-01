#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const dataPath = path.join(repoRoot, "src/lib/cho-neo/room-vote.ts");
const apiPath = path.join(repoRoot, "src/app/api/cho-neo/room-vote/route.ts");
const roomVoteComponentPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoRoomVote.tsx",
);
const villageShellPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoVillageShell.tsx",
);
const schemaPath = path.join(repoRoot, "docs/cho-neo/room-vote-v1.sql");
const musicPlayerPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoThemeParkAudio.tsx",
);

const data = fs.readFileSync(dataPath, "utf8");
const api = fs.readFileSync(apiPath, "utf8");
const repositorySource = fs.readFileSync(
  path.join(repoRoot, "src/lib/cho-neo/room-vote-repository.ts"),
  "utf8",
);
const roomVoteComponent = fs.readFileSync(roomVoteComponentPath, "utf8");
const villageShell = fs.readFileSync(villageShellPath, "utf8");
const schema = fs.readFileSync(schemaPath, "utf8");
const musicPlayer = fs.readFileSync(musicPlayerPath, "utf8");
const { repository, service } = await importRoomVoteApplicationModules();

const approvedOptions = [
  ["show-off", "Khoe Sắc Đẹp", "Show-Off Gallery"],
  ["owner-corner", "Góc Chủ Tiệm", "Owner Corner"],
  ["nail-tech-corner", "Góc Thợ Nail", "Nail Tech Corner"],
  ["waterfront", "Bến Nước", "Waterfront"],
];

test("room vote V1 has exactly the four approved options in canonical order", () => {
  const optionKeys = [...data.matchAll(/key: "([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(
    optionKeys,
    approvedOptions.map(([key]) => key),
  );

  for (const [key, title, englishTitle] of approvedOptions) {
    assert.match(data, new RegExp(`key: "${key}"`));
    assert.match(data, new RegExp(`title: "${escapeRegExp(title)}"`));
    assert.match(data, new RegExp(`englishTitle: "${escapeRegExp(englishTitle)}"`));
    assert.match(schema, new RegExp(`'${key}'`));
  }

  assert.doesNotMatch(data, /market-street|Market Street|Phố Chợ/);
  assert.match(data, /CHO_NEO_ROOM_VOTE_POLL_KEY = "cho-neo-room-vote-v1"/);
});

test("room voting owns the full voting section and the shared pass gate", () => {
  assert.match(roomVoteComponent, /Góc Bình Chọn — Mở gì trước\?/);
  assert.match(roomVoteComponent, /Tôi muốn phòng này/);
  assert.match(roomVoteComponent, /Đã chọn/);
  assert.match(roomVoteComponent, /Bạn đã chọn:/);
  assert.match(roomVoteComponent, /Đổi lựa chọn/);
  assert.match(roomVoteComponent, /Vì sao bạn muốn mở phòng này\?/);
  assert.match(roomVoteComponent, /Bỏ qua/);
  assert.match(roomVoteComponent, /ensureChoNeoMember/);
  assert.match(roomVoteComponent, /Authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(roomVoteComponent, /newsletter|marketing|phone|password/i);
});

test("Village Guide shortcut opens the standalone room vote component", () => {
  assert.match(villageShell, /Bình chọn mở phòng/);
  assert.match(villageShell, /CHO_NEO_ROOM_VOTE_OPEN_EVENT/);
  assert.match(villageShell, /<ChoNeoRoomVote \/>/);
  assert.match(roomVoteComponent, /window\.addEventListener\(CHO_NEO_ROOM_VOTE_OPEN_EVENT/);
  assert.match(roomVoteComponent, /id="cho-neo-room-vote"/);
});

test("room votes are owned by the verified Supabase member", () => {
  assert.match(
    fs.readFileSync(path.join(repoRoot, "src/lib/cho-neo/room-vote-service.ts"), "utf8"),
    /createHmac\("sha256"/,
  );
  assert.match(
    fs.readFileSync(path.join(repoRoot, "src/lib/cho-neo/room-vote-service.ts"), "utf8"),
    /\.update\(`\$\{CHO_NEO_ROOM_VOTE_POLL_KEY\}:\$\{token\}`\)/,
  );
  assert.match(repositorySource, /voter_user_id: input\.voterUserId/);
  assert.match(repositorySource, /findSelection\(input\.pollKey, input\.voterUserId\)/);
  assert.match(repositorySource, /\.update\(row\)/);
  assert.match(repositorySource, /\.insert\(row\)/);
  assert.match(api, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(api, /auth\.getUser\(token\)/);
  assert.match(api, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(schema, /email|phone|ip_address|fingerprint|advertising/i);
});

test("server route updates one verified-member vote and rejects invalid inputs", () => {
  const serviceSource = fs.readFileSync(
    path.join(repoRoot, "src/lib/cho-neo/room-vote-service.ts"),
    "utf8",
  );
  assert.match(serviceSource, /body\.pollKey !== CHO_NEO_ROOM_VOTE_POLL_KEY/);
  assert.match(serviceSource, /!isChoNeoRoomVoteOptionKey\(body\.optionKey\)/);
  assert.match(serviceSource, /missing-cho-neo-member/);
  assert.match(serviceSource, /findActiveMemberProfile\(voterUserId\)/);
  assert.match(serviceSource, /unverified-cho-neo-member/);
  assert.match(repositorySource, /cho_neo_member_profiles/);
  assert.match(serviceSource, /CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH/);
  assert.match(serviceSource, /isChoNeoRoomVoteReasonUnsafe\(rawReason\)/);
  assert.match(repositorySource, /findSelection\(input\.pollKey, input\.voterUserId\)/);
  assert.match(repositorySource, /\.update\(row\)/);
  assert.match(repositorySource, /\.insert\(row\)/);
  assert.match(schema, /unique index[^;]+poll_key, voter_user_id/s);
  assert.match(schema, /voter_user_id = auth\.uid\(\)/);
  assert.match(serviceSource, /RATE_LIMIT_MAX = 8/);
  assert.match(serviceSource, /MIN_UPDATE_INTERVAL_MS = 1_500/);
});

test("results hide low participation and reveal server percentages only at threshold", () => {
  assert.match(data, /CHO_NEO_ROOM_VOTE_PUBLIC_RESULTS_THRESHOLD = 10/);
  assert.match(data, /CHO_NEO_ROOM_VOTE_ATTENTION_THRESHOLD = 20/);
  assert.match(data, /totalVotes >= CHO_NEO_ROOM_VOTE_PUBLIC_RESULTS_THRESHOLD/);
  assert.match(data, /statusLabel: disclosure\.label/);
  assert.match(data, /Math\.round\(\(count \/ totalVotes\) \* 100\)/);
  assert.match(data, /rank === 1/);
  assert.match(data, /Được quan tâm/);
  assert.match(roomVoteComponent, /Tổng lượt tham gia:/);
  assert.match(roomVoteComponent, /Đang lấy ý kiến/);
  assert.doesNotMatch(roomVoteComponent, /Winner|Guaranteed|Opening next|Approved/);
});

test("voting failure stays truthful and does not show success", () => {
  assert.match(roomVoteComponent, /Chưa lấy được bình chọn\. Chợ Neo không tự bịa số\./);
  assert.match(roomVoteComponent, /setSaveStatus\("error"\)/);
  assert.match(roomVoteComponent, /saveStatus === "saved"/);
  assert.match(roomVoteComponent, /Đã ghi nhận lựa chọn của bạn\./);
  assert.match(roomVoteComponent, /Đã cập nhật lựa chọn\./);
});

test("existing music player is not modified by the room vote feature", () => {
  assert.match(musicPlayer, /Danh sách nhạc Chợ Neo/);
  assert.match(musicPlayer, /onEnded=\{handleAudioEnded\}/);
  assert.doesNotMatch(roomVoteComponent, /ChoNeoThemeParkAudio/);
  assert.doesNotMatch(villageShell, /ChoNeoThemeParkAudio/);
});

test("in-memory adapter creates and updates one vote per pass user", async () => {
  const fake = new repository.InMemoryRoomVoteRepository();
  const app = service.createRoomVoteApplication({
    hashSecret: "server-only-test-secret",
    rateLimit: false,
    repository: fake,
  });
  const voterUserId = "00000000-0000-4000-8000-000000000001";

  const first = await app.post(
    {
      optionKey: "show-off",
      pollKey: "cho-neo-room-vote-v1",
    },
    voterUserId,
  );
  assert.equal(first.status, 200);
  assert.equal(fake.recordCount, 1);
  assert.equal(first.body.selection.optionKey, "show-off");

  const changed = await app.post(
    {
      optionKey: "owner-corner",
      optionalReason: "Muốn bàn chuyện vận hành.",
      pollKey: "cho-neo-room-vote-v1",
    },
    voterUserId,
  );
  assert.equal(changed.status, 200);
  assert.equal(fake.recordCount, 1);
  assert.equal(changed.body.selection.optionKey, "owner-corner");
  assert.equal(changed.body.selection.optionalReason, "Muốn bàn chuyện vận hành.");

  const cleared = await app.post(
    {
      optionKey: "owner-corner",
      optionalReason: "",
      pollKey: "cho-neo-room-vote-v1",
    },
    voterUserId,
  );
  assert.equal(cleared.status, 200);
  assert.equal(fake.recordCount, 1);
  assert.equal(cleared.body.selection.optionalReason, "");
});

test("in-memory adapter rejects invalid vote inputs before persistence", async () => {
  const fake = new repository.InMemoryRoomVoteRepository();
  const app = service.createRoomVoteApplication({
    hashSecret: "server-only-test-secret",
    rateLimit: false,
    repository: fake,
  });
  const voterUserId = "00000000-0000-4000-8000-000000000002";

  assert.equal(
    (
      await app.post(
        {
          optionKey: "market-street",
          pollKey: "cho-neo-room-vote-v1",
        },
        voterUserId,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await app.post(
        {
          optionKey: "show-off",
          optionalReason: "x".repeat(281),
          pollKey: "cho-neo-room-vote-v1",
        },
        voterUserId,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await app.post(
        {
          optionKey: "show-off",
          optionalReason: "<b>link</b>",
          pollKey: "cho-neo-room-vote-v1",
        },
        voterUserId,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await app.post(
        {
          optionKey: "show-off",
          optionalReason: "https://example.com",
          pollKey: "cho-neo-room-vote-v1",
        },
        voterUserId,
      )
    ).status,
    400,
  );
  assert.equal(fake.recordCount, 0);
});

test("unverified or missing member profiles cannot vote through the service-role API", async () => {
  const voterUserId = "00000000-0000-4000-8000-000000000020";
  const fake = new repository.InMemoryRoomVoteRepository([], {
    inactiveUserIds: [voterUserId],
  });
  const app = service.createRoomVoteApplication({
    hashSecret: "server-only-test-secret",
    rateLimit: false,
    repository: fake,
  });

  const response = await app.post(
    {
      optionKey: "show-off",
      pollKey: "cho-neo-room-vote-v1",
    },
    voterUserId,
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.reason, "unverified-cho-neo-member");
  assert.equal(fake.recordCount, 0);
});

test("in-memory adapter result disclosure follows public thresholds", async () => {
  const seed = Array.from({ length: 20 }, (_, index) => ({
    optionKey:
      index < 9
        ? "show-off"
        : index < 15
          ? "owner-corner"
          : index < 18
            ? "nail-tech-corner"
            : "waterfront",
    optionalReason: "",
    pollKey: "cho-neo-room-vote-v1",
    voterUserId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  }));
  const lowFake = new repository.InMemoryRoomVoteRepository(seed.slice(0, 9));
  const publicFake = new repository.InMemoryRoomVoteRepository(seed.slice(0, 10));
  const attentionFake = new repository.InMemoryRoomVoteRepository(seed);

  const low = await service
    .createRoomVoteApplication({
      hashSecret: "server-only-test-secret",
      rateLimit: false,
      repository: lowFake,
    })
    .get(null);
  assert.equal(low.status, 200);
  assert.equal(low.body.disclosure.state, "collecting");
  assert.equal(low.body.results.some((result) => "percentage" in result), false);

  const publicResult = await service
    .createRoomVoteApplication({
      hashSecret: "server-only-test-secret",
      rateLimit: false,
      repository: publicFake,
    })
    .get(null);
  assert.equal(publicResult.status, 200);
  assert.deepEqual(publicResult.body.disclosure, {
    state: "public",
    totalVotes: 10,
  });
  assert.deepEqual(publicResult.body.results[0], {
    key: "show-off",
    percentage: 90,
    rank: 1,
  });
  assert.deepEqual(publicResult.body.results[1], {
    key: "owner-corner",
    percentage: 10,
    rank: 2,
  });

  const attention = await service
    .createRoomVoteApplication({
      hashSecret: "server-only-test-secret",
      rateLimit: false,
      repository: attentionFake,
    })
    .get(null);
  assert.equal(attention.status, 200);
  assert.equal(
    attention.body.results.filter(
      (result) => result.attentionLabel === "Được quan tâm",
    ).length,
    1,
  );
  assert.equal(attention.body.results[0].attentionLabel, "Được quan tâm");
});

test("persistence failure and missing server secret fail closed", async () => {
  const failingRepository = {
    async findActiveMemberProfile() {
      return true;
    },
    async findSelection() {
      throw new Error("boom");
    },
    async listVotes() {
      throw new Error("boom");
    },
    async upsertVote() {
      throw new Error("boom");
    },
  };
  const app = service.createRoomVoteApplication({
    hashSecret: "server-only-test-secret",
    rateLimit: false,
    repository: failingRepository,
  });
  const failed = await app.post(
    {
      optionKey: "show-off",
      pollKey: "cho-neo-room-vote-v1",
    },
    "00000000-0000-4000-8000-000000000003",
  );
  assert.equal(failed.status, 503);
  assert.equal(failed.body.reason, "save-failed");

  const missingSecret = await service
    .createRoomVoteApplication({
      hashSecret: undefined,
      rateLimit: false,
      repository: new repository.InMemoryRoomVoteRepository(),
    })
    .post(
      {
        optionKey: "show-off",
        pollKey: "cho-neo-room-vote-v1",
      },
      "00000000-0000-4000-8000-000000000004",
    );
  assert.equal(missingSecret.status, 503);
  assert.equal(missingSecret.body.reason, "missing-server-secret");
});

test("application responses never expose raw user id or voter hash", async () => {
  const fake = new repository.InMemoryRoomVoteRepository();
  const app = service.createRoomVoteApplication({
    hashSecret: "server-only-test-secret",
    rateLimit: false,
    repository: fake,
  });
  const voterUserId = "00000000-0000-4000-8000-000000000005";
  const response = await app.post(
    {
      optionKey: "waterfront",
      pollKey: "cho-neo-room-vote-v1",
    },
    voterUserId,
  );
  const json = JSON.stringify(response.body);
  const voterHash = service.hashRoomVoteToken(voterUserId, "server-only-test-secret");

  assert.equal(response.status, 200);
  assert.equal(json.includes(voterUserId), false);
  assert.equal(json.includes(voterHash), false);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function importRoomVoteApplicationModules() {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "cho-neo-room-vote-tests-"),
  );
  const files = [
    "room-vote.ts",
    "room-vote-repository.ts",
    "room-vote-service.ts",
  ];

  for (const file of files) {
    const sourcePath = path.join(repoRoot, "src/lib/cho-neo", file);
    let source = fs.readFileSync(sourcePath, "utf8");
    source = source
      .replaceAll('from "./room-vote"', 'from "./room-vote.ts"')
      .replaceAll(
        'from "./room-vote-repository"',
        'from "./room-vote-repository.ts"',
      );
    fs.writeFileSync(path.join(tempDir, file), source);
  }

  return {
    repository: await import(path.join(tempDir, "room-vote-repository.ts")),
    service: await import(path.join(tempDir, "room-vote-service.ts")),
  };
}
