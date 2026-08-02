import { createHmac } from "node:crypto";
import {
  CHO_NEO_ROOM_VOTE_POLL_KEY,
  CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH,
  buildChoNeoRoomVotePresentation,
  isChoNeoRoomVoteOptionKey,
  isChoNeoRoomVoteReasonUnsafe,
  sanitizeChoNeoRoomVoteReason,
} from "./room-vote";
import type {
  ChoNeoRoomVoteOptionKey,
  ChoNeoRoomVotePresentation,
} from "./room-vote";
import type { ChoNeoRoomVoteRepository } from "./room-vote-repository";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const MIN_UPDATE_INTERVAL_MS = 1_500;

export type RoomVoteApplicationResponse =
  | {
      body: ChoNeoRoomVotePresentation;
      status: 200;
    }
  | {
      body: { error: string; reason: string };
      status: 400 | 429 | 503;
    };

export type RoomVotePostBody = {
  optionalReason?: unknown;
  optionKey?: unknown;
  pollKey?: unknown;
};

type RoomVoteApplicationOptions = {
  hashSecret: string | null | undefined;
  rateLimit?: boolean;
  repository: ChoNeoRoomVoteRepository;
};

const updateBuckets = new Map<string, number[]>();
const lastUpdates = new Map<string, number>();

export function createRoomVoteApplication({
  hashSecret,
  rateLimit = true,
  repository,
}: RoomVoteApplicationOptions) {
  const hasServerSecret = Boolean(hashSecret);

  return {
    get: async (
      voterUserId: string | null | undefined,
    ): Promise<RoomVoteApplicationResponse> => {
      if (!hasServerSecret) {
        return unavailable("missing-server-secret");
      }

      try {
        const hasUser = isPlausibleChoNeoMemberUserId(voterUserId);

        return {
          body: buildChoNeoRoomVotePresentation({
            rows: await repository.listVotes(CHO_NEO_ROOM_VOTE_POLL_KEY),
            selection: hasUser
              ? await repository.findSelection(
                  CHO_NEO_ROOM_VOTE_POLL_KEY,
                  voterUserId,
                )
              : null,
          }),
          status: 200,
        };
      } catch {
        return unavailable("read-failed");
      }
    },
    post: async (
      body: RoomVotePostBody,
      voterUserId: string | null | undefined,
    ): Promise<RoomVoteApplicationResponse> => {
      if (!hasServerSecret) {
        return unavailable("missing-server-secret");
      }

      if (!isPlausibleChoNeoMemberUserId(voterUserId)) {
        return {
          body: {
            error: "Vào Chợ Neo và xác nhận thành viên trước khi bình chọn nha.",
            reason: "missing-cho-neo-member",
          },
          status: 400,
        };
      }

      const validation = validatePostBody(body);
      if (validation.ok === false) {
        return validation.response;
      }

      try {
        const hasActiveProfile =
          await repository.findActiveMemberProfile(voterUserId);

        if (!hasActiveProfile) {
          return {
            body: {
          error: "Xác nhận thành viên ngành nail trước khi bình chọn nha.",
          reason: "unverified-cho-neo-member",
            },
            status: 400,
          };
        }
      } catch {
        return unavailable("profile-read-failed");
      }

      const voterHash = hashRoomVoteToken(voterUserId, hashSecret);

      if (rateLimit && isUpdateRateLimited(voterHash)) {
        return {
          body: {
            error: "Con đổi lựa chọn hơi nhanh. Nghỉ một nhịp rồi thử lại nha.",
            reason: "rate-limited",
          },
          status: 429,
        };
      }

      try {
        await repository.upsertVote({
          optionKey: validation.optionKey,
          optionalReason: sanitizeChoNeoRoomVoteReason(validation.rawReason),
          pollKey: CHO_NEO_ROOM_VOTE_POLL_KEY,
          voterHash,
          voterUserId,
        });

        return {
          body: buildChoNeoRoomVotePresentation({
            rows: await repository.listVotes(CHO_NEO_ROOM_VOTE_POLL_KEY),
            selection: await repository.findSelection(
              CHO_NEO_ROOM_VOTE_POLL_KEY,
              voterUserId,
            ),
          }),
          status: 200,
        };
      } catch {
        return unavailable("save-failed");
      }
    },
  };
}

export function hashRoomVoteToken(token: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${CHO_NEO_ROOM_VOTE_POLL_KEY}:${token}`)
    .digest("hex");
}

function validatePostBody(body: RoomVotePostBody):
  | {
      ok: true;
      optionKey: ChoNeoRoomVoteOptionKey;
      rawReason: string;
    }
  | { ok: false; response: RoomVoteApplicationResponse } {
  if (!body || body.pollKey !== CHO_NEO_ROOM_VOTE_POLL_KEY) {
    return {
      ok: false,
      response: {
        body: {
          error: "Phiếu bình chọn không hợp lệ.",
          reason: "invalid-poll",
        },
        status: 400,
      },
    };
  }

  if (!isChoNeoRoomVoteOptionKey(body.optionKey)) {
    return {
      ok: false,
      response: {
        body: {
          error: "Chọn một phòng trong danh sách Chợ Neo nha.",
          reason: "invalid-option",
        },
        status: 400,
      },
    };
  }

  const rawReason =
    typeof body.optionalReason === "string" ? body.optionalReason : "";

  if (rawReason.length > CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH) {
    return {
      ok: false,
      response: {
        body: {
          error: `Lý do tối đa ${CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH} ký tự.`,
          reason: "reason-too-long",
        },
        status: 400,
      },
    };
  }

  if (isChoNeoRoomVoteReasonUnsafe(rawReason)) {
    return {
      ok: false,
      response: {
        body: {
          error: "Lý do chỉ nhận chữ thường, không nhận link hay HTML.",
          reason: "unsafe-reason",
        },
        status: 400,
      },
    };
  }

  return {
    ok: true,
    optionKey: body.optionKey,
    rawReason,
  };
}

function isPlausibleChoNeoMemberUserId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isUpdateRateLimited(voterHash: string, now = Date.now()) {
  const recent = (updateBuckets.get(voterHash) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  const lastUpdateAt = lastUpdates.get(voterHash);

  if (
    recent.length >= RATE_LIMIT_MAX ||
    Boolean(lastUpdateAt && now - lastUpdateAt < MIN_UPDATE_INTERVAL_MS)
  ) {
    updateBuckets.set(voterHash, recent);
    return true;
  }

  recent.push(now);
  updateBuckets.set(voterHash, recent);
  lastUpdates.set(voterHash, now);
  return false;
}

function unavailable(reason: string): RoomVoteApplicationResponse {
  return {
    body: {
      error: "Chưa lấy được bình chọn. Thử lại giúp Chợ Neo một nhịp nha.",
      reason,
    },
    status: 503,
  };
}
