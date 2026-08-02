"use client";

import type {
  ChangeEvent,
  FormEvent,
  RefObject,
} from "react";
import { useState } from "react";
import type { KhoeSetCategory } from "./types";

type UploadPanelProps = {
  caption: string;
  captionLimit: number;
  categoryOptions: KhoeSetCategory[];
  captionRef: RefObject<HTMLTextAreaElement | null>;
  creatorName: string;
  imageDataUrl?: string;
  notice: string;
  promptChips: string[];
  selectedCategory: KhoeSetCategory;
  styleTagsText: string;
  onCaptionChange: (value: string) => void;
  onCategoryChange: (category: KhoeSetCategory) => void;
  onCreatorNameChange: (value: string) => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPromptClick: (prompt: string) => void;
  onStyleTagsChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function UploadPanel({
  caption,
  captionLimit,
  categoryOptions,
  captionRef,
  creatorName,
  imageDataUrl,
  notice,
  promptChips,
  selectedCategory,
  styleTagsText,
  onCaptionChange,
  onCategoryChange,
  onCreatorNameChange,
  onImageChange,
  onPromptClick,
  onStyleTagsChange,
  onSubmit,
}: UploadPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      className={`show-off-upload-rail ${isOpen ? "is-open" : ""}`}
      id="dang-bo-mong"
      aria-label="Đăng bộ móng"
    >
      <section className="show-off-upload-card">
        <button
          className="show-off-upload-summary"
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls="show-off-upload-form"
        >
          <div>
            <p>Đóng góp</p>
            <h2>Đăng bộ móng</h2>
          </div>
          <span>{caption.length}/{captionLimit}</span>
        </button>

        <form className="show-off-upload-form" id="show-off-upload-form" onSubmit={onSubmit}>
          <div className="show-off-upload-preview">
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="Ảnh bộ móng đang chuẩn bị đăng" />
            ) : (
              <span aria-hidden="true">+</span>
            )}
            <label>
              Chọn ảnh
              <input type="file" accept="image/*" onChange={onImageChange} />
            </label>
          </div>

          <label className="show-off-field">
            <span>Tên hiển thị</span>
            <input
              value={creatorName}
              maxLength={42}
              onChange={(event) => onCreatorNameChange(event.target.value)}
              placeholder="Mai Nail"
            />
          </label>

          <label className="show-off-field">
            <span>Danh mục</span>
            <select
              value={selectedCategory}
              onChange={(event) => onCategoryChange(event.target.value as KhoeSetCategory)}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <textarea
            ref={captionRef}
            value={caption}
            maxLength={captionLimit}
            onChange={(event) => onCaptionChange(event.target.value)}
            placeholder="Viết vài chữ về bộ móng này..."
          />

          <label className="show-off-field">
            <span>Style tags</span>
            <input
              value={styleTagsText}
              maxLength={80}
              onChange={(event) => onStyleTagsChange(event.target.value)}
              placeholder="màu khách mê, nail art"
            />
          </label>

          <div className="show-off-prompt-row" aria-label="Gợi ý caption">
            {promptChips.map((prompt) => (
              <button key={prompt} type="button" onClick={() => onPromptClick(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <button className="show-off-submit" type="submit">
            Đăng bộ móng
          </button>
          {notice ? <p className="show-off-notice">{notice}</p> : null}
        </form>
      </section>

      <section className="show-off-room-rules" aria-label="Nếp phòng Trưng Bày">
        <strong>Nếp phòng</strong>
        <span>Không chê tay nghề người khác.</span>
        <span>Không spam bán hàng.</span>
        <span>Giữ riêng tư nếu ảnh có người.</span>
      </section>
    </aside>
  );
}
