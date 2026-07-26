import type { SupabaseClient } from "@supabase/supabase-js";
import { CHO_NEO_ROOM_VOTE_POLL_KEY } from "./room-vote";
import type {
  ChoNeoRoomVoteOptionKey,
  ChoNeoRoomVoteRow,
  ChoNeoRoomVoteSelectionRow,
} from "./room-vote";

export type ChoNeoRoomVoteUpsertInput = {
  optionKey: ChoNeoRoomVoteOptionKey;
  optionalReason: string;
  pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY;
  voterHash?: string;
  voterUserId: string;
};

export type ChoNeoRoomVoteRepository = {
  findActiveMemberProfile(userId: string): Promise<boolean>;
  findSelection(
    pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY,
    voterUserId: string,
  ): Promise<ChoNeoRoomVoteSelectionRow | null>;
  listVotes(
    pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY,
  ): Promise<ChoNeoRoomVoteRow[]>;
  upsertVote(input: ChoNeoRoomVoteUpsertInput): Promise<void>;
};

type StoredRoomVote = {
  option_key: ChoNeoRoomVoteOptionKey;
  optional_reason: string | null;
  poll_key: typeof CHO_NEO_ROOM_VOTE_POLL_KEY;
  voter_hash: string;
  voter_user_id: string;
};

export class SupabaseRoomVoteRepository implements ChoNeoRoomVoteRepository {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async findActiveMemberProfile(userId: string) {
    const { data, error } = await this.supabase
      .from("cho_neo_member_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("membership_status", "verified_nail_member")
      .maybeSingle();

    if (error) {
      throw new Error("room-vote-profile-read-failed");
    }

    return Boolean(data);
  }

  async listVotes(pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY) {
    const { data, error } = await this.supabase
      .from("cho_neo_room_votes")
      .select("option_key")
      .eq("poll_key", pollKey);

    if (error) {
      throw new Error("room-vote-read-failed");
    }

    return (data ?? []) as ChoNeoRoomVoteRow[];
  }

  async findSelection(
    pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY,
    voterUserId: string,
  ) {
    const { data, error } = await this.supabase
      .from("cho_neo_room_votes")
      .select("option_key, optional_reason")
      .eq("poll_key", pollKey)
      .eq("voter_user_id", voterUserId)
      .maybeSingle();

    if (error) {
      throw new Error("room-vote-selection-read-failed");
    }

    return data as ChoNeoRoomVoteSelectionRow | null;
  }

  async upsertVote(input: ChoNeoRoomVoteUpsertInput) {
    const row = {
      option_key: input.optionKey,
      optional_reason: input.optionalReason || null,
      poll_key: input.pollKey,
      updated_at: new Date().toISOString(),
      voter_hash: input.voterHash ?? input.voterUserId,
      voter_user_id: input.voterUserId,
    };
    const existing = await this.findSelection(input.pollKey, input.voterUserId);

    if (existing) {
      const { error } = await this.supabase
        .from("cho_neo_room_votes")
        .update(row)
        .eq("poll_key", input.pollKey)
        .eq("voter_user_id", input.voterUserId);

      if (error) {
        throw new Error("room-vote-save-failed");
      }

      return;
    }

    const { error } = await this.supabase.from("cho_neo_room_votes").insert(row);

    if (error) {
      throw new Error("room-vote-save-failed");
    }
  }
}

export class InMemoryRoomVoteRepository implements ChoNeoRoomVoteRepository {
  private readonly inactiveUserIds: Set<string>;
  private readonly votes = new Map<string, StoredRoomVote>();

  constructor(
    seedVotes: ChoNeoRoomVoteUpsertInput[] = [],
    options: { inactiveUserIds?: string[] } = {},
  ) {
    this.inactiveUserIds = new Set(options.inactiveUserIds ?? []);

    for (const vote of seedVotes) {
      this.setVote(vote);
    }
  }

  get recordCount() {
    return this.votes.size;
  }

  get records() {
    return Array.from(this.votes.values());
  }

  async findActiveMemberProfile(userId: string) {
    return !this.inactiveUserIds.has(userId);
  }

  async listVotes(pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY) {
    return this.records
      .filter((vote) => vote.poll_key === pollKey)
      .map((vote) => ({ option_key: vote.option_key }));
  }

  async findSelection(
    pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY,
    voterUserId: string,
  ) {
    const vote = this.votes.get(this.getKey(pollKey, voterUserId));

    if (!vote) return null;

    return {
      option_key: vote.option_key,
      optional_reason: vote.optional_reason,
    };
  }

  async upsertVote(input: ChoNeoRoomVoteUpsertInput) {
    this.setVote(input);
  }

  private setVote(input: ChoNeoRoomVoteUpsertInput) {
    this.votes.set(this.getKey(input.pollKey, input.voterUserId), {
      option_key: input.optionKey,
      optional_reason: input.optionalReason || null,
      poll_key: input.pollKey,
      voter_hash: input.voterHash ?? input.voterUserId,
      voter_user_id: input.voterUserId,
    });
  }

  private getKey(
    pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY,
    voterUserId: string,
  ) {
    return `${pollKey}:${voterUserId}`;
  }
}
