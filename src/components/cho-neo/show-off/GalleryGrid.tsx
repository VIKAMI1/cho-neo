import { GalleryCard } from "./GalleryCard";
import type { KhoeSetPost } from "./types";

type GalleryGridProps = {
  posts: KhoeSetPost[];
  totalCount: number;
  query: string;
};

export function GalleryGrid({ posts, totalCount, query }: GalleryGridProps) {
  if (posts.length === 0) {
    return (
      <section className="show-off-empty-state" aria-live="polite">
        <strong>{query ? "Không tìm thấy bộ móng phù hợp." : "Chưa có bộ móng nào."}</strong>
        <span>
          {query
            ? "Thử tên tiệm, màu, phong cách, hoặc đổi danh mục."
            : "Đăng bộ móng đầu tiên để mở tường trưng bày."}
        </span>
      </section>
    );
  }

  return (
    <section className="show-off-gallery-section" aria-label="Bộ móng mới">
      <div className="show-off-section-heading">
        <div>
          <p>Bộ móng mới</p>
          <h2>Góc trưng bày của làng</h2>
        </div>
        <span>
          {posts.length}/{totalCount} ảnh
        </span>
      </div>

      <div className="show-off-gallery-grid">
        {posts.map((post) => (
          <GalleryCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
