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
  voterHash: string;
};

export type ChoNeoRoomVoteRepository = {
  findSelection(
    pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY,
    voterHash: string,
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
};

export class SupabaseRoomVoteRepository implements ChoNeoRoomVoteRepository {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
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
    voterHash: string,
  ) {
    const { data, error } = await this.supabase
      .from("cho_neo_room_votes")
      .select("option_key, optional_reason")
      .eq("poll_key", pollKey)
      .eq("voter_hash", voterHash)
      .maybeSingle();

    if (error) {
      throw new Error("room-vote-selection-read-failed");
    }

    return data as ChoNeoRoomVoteSelectionRow | null;
  }

  async upsertVote(input: ChoNeoRoomVoteUpsertInput) {
    const { error } = await this.supabase.from("cho_neo_room_votes").upsert(
      {
        option_key: input.optionKey,
        optional_reason: input.optionalReason || null,
        poll_key: input.pollKey,
        updated_at: new Date().toISOString(),
        voter_hash: input.voterHash,
      },
      { onConflict: "poll_key,voter_hash" },
    );

    if (error) {
      throw new Error("room-vote-save-failed");
    }
  }
}

export class InMemoryRoomVoteRepository implements ChoNeoRoomVoteRepository {
  private readonly votes = new Map<string, StoredRoomVote>();

  constructor(seedVotes: ChoNeoRoomVoteUpsertInput[] = []) {
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

  async listVotes(pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY) {
    return this.records
      .filter((vote) => vote.poll_key === pollKey)
      .map((vote) => ({ option_key: vote.option_key }));
  }

  async findSelection(
    pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY,
    voterHash: string,
  ) {
    const vote = this.votes.get(this.getKey(pollKey, voterHash));

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
    this.votes.set(this.getKey(input.pollKey, input.voterHash), {
      option_key: input.optionKey,
      optional_reason: input.optionalReason || null,
      poll_key: input.pollKey,
      voter_hash: input.voterHash,
    });
  }

  private getKey(
    pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY,
    voterHash: string,
  ) {
    return `${pollKey}:${voterHash}`;
  }
}
