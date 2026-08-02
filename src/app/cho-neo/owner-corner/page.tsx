import { ChoNeoCommunityNoteRoom } from "@/components/cho-neo/ChoNeoCommunityNoteRoom";

export default function ChoNeoOwnerCornerPage() {
  return (
    <ChoNeoCommunityNoteRoom
      roomId="owner-corner"
      viTitle="Góc Chủ Tiệm"
      enTitle="Owner Corner"
      purpose="Một góc cho chủ tiệm nhìn lại áp lực, bài học, và cách giữ tiệm chạy êm hơn."
      prompts={[
        "Hôm nay điều gì làm chủ tiệm đau đầu?",
        "Có chuyện gì mình muốn thợ hiểu hơn?",
        "Một điều nhỏ giúp tiệm chạy êm hơn?",
      ]}
      placeholder="Viết một ghi chú nhẹ cho chủ tiệm khác..."
      guardrails={[
        "Không gọi tên thợ, khách, hay tiệm.",
        "Không biến áp lực thành đổ lỗi.",
        "Nói một điều có thể làm êm hơn.",
      ]}
      tone="owner"
      locked
      previewScale="small"
      previewImage="/images/cho-neo/goc-chu-tiem-locked-room-16x9.png"
    />
  );
}
