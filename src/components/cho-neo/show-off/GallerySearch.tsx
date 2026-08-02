"use client";

type GallerySearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function GallerySearch({ value, onChange }: GallerySearchProps) {
  return (
    <label className="show-off-search">
      <span aria-hidden="true">⌕</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm màu, kiểu, tên tiệm..."
      />
    </label>
  );
}
