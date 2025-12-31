"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "dev-123";

// Guardrails (locked)
const MAX_FILES = 3;
const MAX_BYTES_EACH = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

type PresignResp = {
  upload_url: string;
  raw_key: string;
  content_type: string;
};

type CommitResp = {
  status: string;
  url_original: string;
  url_thumb: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
};

type CreatePostResp = {
  post_id: string;
};

function shortName(name: string) {
  if (name.length <= 28) return name;
  return name.slice(0, 18) + "…" + name.slice(-8);
}

export default function ShowOff() {
  // Text
  const [caption, setCaption] = useState("");

  // Images
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // UI
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>("");

  const canPost = useMemo(() => {
    const hasSomething = caption.trim().length > 0 || files.length > 0;
    return !busy && hasSomething && files.length <= MAX_FILES;
  }, [busy, caption, files]);

  // Clean up preview blob urls
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  function addNotice(line: string) {
    setNotice((prev) => (prev ? prev + "\n" + line : line));
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";

    const ok: File[] = [];
    for (const f of picked) {
      if (!ALLOWED.has(f.type)) {
        addNotice(`❌ ${f.name}: unsupported type (${f.type || "unknown"})`);
        continue;
      }
      if (f.size > MAX_BYTES_EACH) {
        addNotice(`❌ ${f.name}: too large (${Math.round(f.size / 1024 / 1024)}MB)`);
        continue;
      }
      ok.push(f);
    }

    const merged = [...files, ...ok].slice(0, MAX_FILES);
    if (merged.length < files.length + ok.length) addNotice(`⚠️ Max ${MAX_FILES} photos. Extra ignored.`);
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

  async function createShowoffPost(captionText: string): Promise<CreatePostResp> {
    const r = await fetch(`${API_BASE}/api/showoff/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({ caption: captionText }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`create post failed (${r.status}): ${t}`);
    }
    return (await r.json()) as CreatePostResp;
  }

  async function commitShowoffMedia(
    postId: string,
    items: Array<CommitResp & { raw_key: string; sort_order: number }>
  ) {
    const r = await fetch(`${API_BASE}/api/showoff/commit-media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({ post_id: postId, items }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`commit-media failed (${r.status}): ${t}`);
    }
  }

  // Hook this into your existing "Show Off — latest" refresh logic if you already have one.
  async function loadLatest() {
    // TODO: replace with your existing fetch for showoff_feed/posts.
    // Example: await fetchShowoffLatest();
    return;
  }

  async function handlePost() {
    setNotice("");
    setBusy(true);

    try {
      const captionText = caption.trim().slice(0, 140);

      // Must have caption or at least 1 image
      if (!captionText && files.length === 0) {
        throw new Error("Add a caption or at least 1 photo.");
      }
      if (files.length > MAX_FILES) {
        throw new Error(`Max ${MAX_FILES} photos.`);
      }

      addNotice("🧾 Creating post…");
      const { post_id } = await createShowoffPost(captionText);
      addNotice(`🧾 Post: ${post_id}`);

      const uploaded: Array<CommitResp & { raw_key: string; sort_order: number }> = [];

      if (files.length > 0) {
        addNotice(`🖼️ Uploading ${files.length} photo(s)…`);

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          addNotice(`→ [${i + 1}/${files.length}] Presign ${shortName(f.name)}`);
          const p = await presign(f);

          addNotice(`→ [${i + 1}/${files.length}] PUT upload`);
          await putUpload(p.upload_url, f);

          addNotice(`→ [${i + 1}/${files.length}] Commit`);
          const c = await commit(post_id, p.raw_key);

          uploaded.push(Object.assign(c, { raw_key: p.raw_key, sort_order: i }));
          addNotice(`✅ Stored: ${c.url_thumb}`);
        }

        addNotice("🧱 Saving media…");
        await commitShowoffMedia(post_id, uploaded);
      }

      addNotice("🎉 Posted.");

      // Reset
      setCaption("");
      setFiles([]);

      // Refresh feed
      await loadLatest();
    } catch (err: any) {
      addNotice(`🔥 ${err?.message ?? String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex items-center gap-3">
          <input
            className="flex-1 rounded-xl border border-black/10 px-4 py-3 outline-none"
            placeholder="Hôm nay muốn khoe gì nè..."
            value={caption}
            maxLength={140}
            onChange={(e) => setCaption(e.target.value)}
            disabled={busy}
          />

        <div className="mt-2 text-[11px] opacity-50">
            ShowOffUploader v2 (photos enabled)
        </div>
        
          {/* Add Photos */}
          <button
            type="button"
            className="rounded-xl border border-black/10 px-3 py-3 text-sm hover:bg-black/5 disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || files.length >= MAX_FILES}
            title={`Add up to ${MAX_FILES} photos`}
          >
            Add Photos
          </button>

          {/* Post */}
          <button
            className="rounded-xl bg-black px-5 py-3 text-white disabled:opacity-50"
            disabled={!canPost}
            onClick={handlePost}
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>

        <div className="mt-2 text-xs opacity-70">
          Tip: viết như nói chuyện ngoài tiệm. Ngắn, thật, không ác. (Max {MAX_FILES} ảnh, 5MB/ảnh)
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={onPick}
          disabled={busy}
        />

        {/* Previews */}
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {previews.slice(0, MAX_FILES).map((src, idx) => (
              <div key={idx} className="relative aspect-square overflow-hidden rounded-xl border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`preview-${idx}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={busy}
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Logs */}
        {notice && (
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-xs leading-5 overflow-auto">
            {notice}
          </pre>
        )}
      </div>

      {/* Feed area is elsewhere in your Cho Neo page (Show Off — latest) */}
    </div>
  );
}
