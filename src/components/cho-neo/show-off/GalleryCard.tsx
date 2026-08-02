import type { KhoeSetPost } from "./types";

type GalleryCardProps = {
  post: KhoeSetPost;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatGalleryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Mới đăng";
  return new Intl.DateTimeFormat("vi", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function GalleryCard({ post }: GalleryCardProps) {
  const initials = getInitials(post.creatorName) || "N";

  return (
    <article className="show-off-card">
      <div className="show-off-card-image">
        {post.imageDataUrl ? (
          <img src={post.imageDataUrl} alt={post.caption} />
        ) : (
          <span>Set</span>
        )}
      </div>

      <div className="show-off-card-body">
        <div className="show-off-creator-row">
          {post.creatorAvatar ? (
            <img src={post.creatorAvatar} alt="" className="show-off-avatar" />
          ) : (
            <span className="show-off-avatar show-off-avatar-fallback" aria-hidden="true">
              {initials}
            </span>
          )}
          <div>
            <strong>{post.creatorName}</strong>
            <small>{formatGalleryDate(post.createdAt)}</small>
          </div>
        </div>

        <p>{post.caption}</p>

        <div className="show-off-tag-row">
          <span>{post.category}</span>
          {post.styleTags.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
