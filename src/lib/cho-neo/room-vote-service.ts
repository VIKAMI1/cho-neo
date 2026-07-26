import { createHmac } from "node:crypto";
import {
  CHO_NEO_ROOM_VOTE_POLL_KEY,
  CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH,
  buildChoNeoRoomVotePresentation,
  isChoNeoRoomVoteOptionKey,
  isChoNeoRoomVoteReasonUnsafe,
  isPlausibleChoNeoRoomVoteToken,
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
  voterToken?: unknown;
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
    get: async (voterToken: unknown): Promise<RoomVoteApplicationResponse> => {
      if (!hasServerSecret) {
        return unavailable("missing-server-secret");
      }

      try {
        const voterHash = isPlausibleChoNeoRoomVoteToken(voterToken)
          ? hashRoomVoteToken(voterToken, hashSecret)
          : null;

        return {
          body: buildChoNeoRoomVotePresentation({
            rows: await repository.listVotes(CHO_NEO_ROOM_VOTE_POLL_KEY),
            selection: voterHash
              ? await repository.findSelection(
                  CHO_NEO_ROOM_VOTE_POLL_KEY,
                  voterHash,
                )
              : null,
          }),
          status: 200,
        };
      } catch {
        return unavailable("read-failed");
      }
    },
    post: async (body: RoomVotePostBody): Promise<RoomVoteApplicationResponse> => {
      if (!hasServerSecret) {
        return unavailable("missing-server-secret");
      }

      const validation = validatePostBody(body);
      if (validation.ok === false) {
        return validation.response;
      }

      const voterHash = hashRoomVoteToken(validation.voterToken, hashSecret);

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
        });

        return {
          body: buildChoNeoRoomVotePresentation({
            rows: await repository.listVotes(CHO_NEO_ROOM_VOTE_POLL_KEY),
            selection: await repository.findSelection(
              CHO_NEO_ROOM_VOTE_POLL_KEY,
              voterHash,
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
      voterToken: string;
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

  if (!isPlausibleChoNeoRoomVoteToken(body.voterToken)) {
    return {
      ok: false,
      response: {
        body: {
          error: "Chưa nhận được mã bình chọn ẩn danh.",
          reason: "invalid-token",
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
    voterToken: body.voterToken,
  };
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
