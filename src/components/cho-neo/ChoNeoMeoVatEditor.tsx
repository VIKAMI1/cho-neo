"use client";

import { useState, type FormEvent } from "react";
import {
  CHO_NEO_MEO_VAT_CATEGORIES,
  type ChoNeoMeoVatCategory,
} from "@/lib/cho-neo/meo-vat";

type ChoNeoMeoVatEditorProps = {
  initialBody?: string;
  initialCategory?: ChoNeoMeoVatCategory;
  initialTitle?: string;
  isBusy: boolean;
  notice?: string;
  onSubmit: (input: { body: string; category: ChoNeoMeoVatCategory; title: string }) => void;
  submitLabel: string;
};

export function ChoNeoMeoVatEditor({
  initialBody = "",
  initialCategory = "nail_tips",
  initialTitle = "",
  isBusy,
  notice = "",
  onSubmit,
  submitLabel,
}: ChoNeoMeoVatEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [category, setCategory] = useState<ChoNeoMeoVatCategory>(initialCategory);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ body, category, title });
  }

  return (
    <form className="meo-vat-editor" onSubmit={submit}>
      <label>
        <span>Chủ đề</span>
        <select onChange={(event) => setCategory(event.target.value as ChoNeoMeoVatCategory)} value={category}>
          {CHO_NEO_MEO_VAT_CATEGORIES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label>
        <span>Tiêu đề <small>{title.length}/100</small></span>
        <input maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="Một mẹo nhỏ giúp ngày làm việc nhẹ hơn" required value={title} />
      </label>
      <label>
        <span>Nội dung <small>{body.length}/3000</small></span>
        <textarea maxLength={3000} onChange={(event) => setBody(event.target.value)} placeholder="Chia sẻ điều bạn đã thử và thấy hữu ích..." required rows={7} value={body} />
      </label>
      <p className="meo-vat-editor-note">Mẹo sẽ được xem lại trước khi xuất hiện công khai. Đừng đưa thông tin cá nhân hoặc đường dẫn vào bài.</p>
      {notice ? <p className="meo-vat-notice" role="status">{notice}</p> : null}
      <button className="meo-vat-primary" disabled={isBusy || !title.trim() || !body.trim()} type="submit">{isBusy ? "Đang lưu..." : submitLabel}</button>
    </form>
  );
}
