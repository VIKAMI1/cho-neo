"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";


const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "dev-123";

const MAX_FILES = 4;
const MAX_BYTES_EACH = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

const supabase = createClient();


type PresignResp = {
  upload_url: string;
  raw_key: string;
  content_type: string;
};

type CommitResp = {
  status: string;
  raw_key: string;
  url_original: string;
  url_thumb: string;
  width: number;
  height: number;
  created_at: string;
};

function shortName(name: string) {
  if (name.length <= 28) return name;
  return name.slice(0, 18) + "…" + name.slice(-8);
}

export default function ShowOffUploader() {
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>("");

  const canSubmit = useMemo(() => !busy && files.length > 0 && files.length <= MAX_FILES, [busy, files]);

  function addLog(line: string) {
    setLog((prev) => (prev ? prev + "\n" + line : line));
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";

    // guardrails
    const ok: File[] = [];
    for (const f of picked) {
      if (!ALLOWED.has(f.type)) {
        addLog(`❌ ${f.name}: unsupported type (${f.type || "unknown"})`);
        continue;
      }
      if (f.size > MAX_BYTES_EACH) {
        addLog(`❌ ${f.name}: too large (${Math.round(f.size / 1024 / 1024)}MB)`);
        continue;
      }
      ok.push(f);
    }

    const merged = [...files, ...ok].slice(0, MAX_FILES);
    if (merged.length < files.length + ok.length) addLog(`⚠️ Max ${MAX_FILES} images. Extra files ignored.`);
    setFiles(merged);
  }

  async function presign(file: File): Promise<PresignResp> {
    const r = await fetch(`${API_BASE}/api/uploads/presign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type,
        bytes: file.size,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`presign failed (${r.status}): ${t}`);
    }
    return (await r.json()) as PresignResp;
  }

  async function putUpload(uploadUrl: string, file: File) {
    const r = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`PUT upload failed (${r.status}): ${t}`);
    }
  }

  async function commit(postId: string, rawKey: string): Promise<CommitResp> {
    const r = await fetch(`${API_BASE}/api/uploads/commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({ post_id: postId, raw_key: rawKey }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`commit failed (${r.status}): ${t}`);
    }
    return (await r.json()) as CommitResp;
  }

  async function handlePublish() {
    // For now we generate a local post id. Later: replace with real DB id from /api/posts.
    const r2PostId = `post_${Date.now()}`;

    setBusy(true);
    setLog("");
    try {
      addLog("🧾 Post: pending…")
      addLog(`🖼️ Uploading ${files.length} image(s)…`);

      const uploaded: CommitResp[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        addLog(`→ [${i + 1}/${files.length}] Presign ${shortName(f.name)}`);
        const p = await presign(f);

        addLog(`→ [${i + 1}/${files.length}] PUT upload`);
        await putUpload(p.upload_url, f);

        addLog(`→ [${i + 1}/${files.length}] Commit`);
        const c = await commit(r2PostId, p.raw_key);

        const finalUploaded: CommitResp = {
          ...c,
          raw_key: p.raw_key, // ✅ carry forward the key from presign
        };

        uploaded.push(finalUploaded);

        addLog(`✅ Stored: ${c.url_thumb}`);
      }

      // This is where you would create the Show Off post record in your DB:
      // POST /api/posts with { zone:"showoff", caption, images:[...] }
      // For now we just show the result.
      addLog("");
      addLog("🎉 Done. Next: save post record with these URLs:");

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) throw new Error("Not signed in");

      const image_urls = uploaded.map((u) => u.url_original);
      const thumb_urls = uploaded.map((u) => u.url_thumb);

      // 1) create (or reuse) today's showoff post
      let postId: string;

      try {
        const { data: postRow, error: postErr } = await supabase
          .from("showoff_posts")
          .insert({
            caption: caption?.trim() || "(no caption)",
            user_id: user.id,
          })
          .select("id")
          .single();

        if (postErr) throw postErr;
        postId = postRow.id;
      } catch (e: any) {
        const msg = String(e?.message ?? "");

        // If we hit the "one per day" constraint, reuse the latest post
        if (!msg.includes("showoff_posts_one_per_day")) throw e;

        addLog("🧷 Today’s post already exists — adding photos to it...");

        const { data: existing, error: findErr } = await supabase
          .from("showoff_posts")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (findErr) throw findErr;
        postId = existing.id;

        // optional: keep caption up to date
        const { error: updErr } = await supabase
          .from("showoff_posts")
          .update({ caption: caption?.trim() || "(no caption)" })
          .eq("id", postId);

        if (updErr) throw updErr;
      }

      // 2) attach media rows (append by sort_order)
      const { data: existingMedia, error: existingErr } = await supabase
        .from("showoff_media")
        .select("sort_order")
        .eq("post_id", postId)
        .order("sort_order", { ascending: false })
        .limit(1);

      if (existingErr) throw existingErr;

      const start = existingMedia?.[0]?.sort_order ?? -1;

      // IMPORTANT:
      // Use ONE canonical field for the image reference.
      // CTO decision: store storage_key, (R2 key), not random full URLs.
      // Each uploaded item MUST include  like:
      // "public/showoff/<r2PostId>/<file>.webp"
      const mediaRows = uploaded.map((u, idx) => ({
        post_id: postId,
        storage_key: u.raw_key,     // ✅ DB column name (NOT NULL)
        url: u.url_original,        // ✅ optional (helps UI right away)
        width: u.width,
        height: u.height,
        sort_order: start + idx + 1,
      }));

      console.log("postId", postId);
      console.log("mediaRows", mediaRows);

      const { data: inserted, error: mediaErr } = await supabase
        .from("showoff_media")
        .insert(mediaRows)
        .select("id, post_id, sort_order, storage_key");

      if (mediaErr) {
        console.error("showoff_media insert failed:", mediaErr);
        addLog(`🔥 media insert failed: ${mediaErr.message}`);
        throw mediaErr;
      }

      console.log("inserted showoff_media", inserted);
      addLog("✅ showoff_media inserted");

      // 3) fetch the post WITH media so feed can render immediately
      const { data: postWithMedia, error: fetchErr } = await supabase
        .from("showoff_posts")
        .select(`
    id,
    created_at,
    caption,
    user_id,
    showoff_media (
      id,
      storage_key,
      url,
      width,
      height,
      sort_order
    )
  `)
        .eq("id", postId)
        .single();

      if (fetchErr) throw fetchErr;

      // Ensure consistent order
      postWithMedia.showoff_media?.sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );

      addLog("✅ Saved. Updating feed...");

      // OPTION A (best): update your state directly (no reload)
      // setFeed((prev) => [postWithMedia, ...prev.filter(p => p.id !== postWithMedia.id)]);

      // OPTION B (fallback): if your feed state is messy, reload
      // window.location.reload();

      return postWithMedia;

      // optional: clear form
      setFiles([]);
      setCaption("");

      // optional: clear form
      // setFiles([]); setCaption("");

    } catch (err: any) {
      addLog(`🔥 ${err?.message ?? String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">Show Off</h1>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Caption</label>
        <textarea
          className="w-full rounded-lg border border-black/10 p-3 outline-none"
          rows={3}
          placeholder="What did you create today?"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Photos (max {MAX_FILES})</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={onPick}
          disabled={busy || files.length >= MAX_FILES}
        />

        {files.length > 0 && (
          <ul className="text-sm space-y-1">
            {files.map((f, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2">
                <span>{shortName(f.name)}</span>
                <button
                  className="text-xs underline opacity-70 hover:opacity-100"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={busy}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        className="w-full rounded-lg bg-black text-white py-3 disabled:opacity-50"
        disabled={!canSubmit}
        onClick={handlePublish}
      >
        {busy ? "Uploading…" : "Upload Photos"}
      </button>

      {log && (
        <pre className="whitespace-pre-wrap rounded-lg bg-black/5 p-3 text-xs leading-5 overflow-auto">
          {log}
        </pre>
      )}

      <p className="text-xs opacity-70">
        <span className="font-medium">Rules:</span> 1 Show-Off post per day (you can add photos to today’s post anytime).{" "}
        <span className="font-medium">Limits:</span> Up to 4 photos per post • No duplicate photos • JPG/PNG/WEBP only • Max 5MB each • EXIF removed on upload.{" "}
        <span className="font-medium">Note:</span> Reactions only. Keep it clean.
      </p>
    </div>
  );
}
