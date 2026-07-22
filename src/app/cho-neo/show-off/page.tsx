import { ChoNeoCommunityNoteRoom } from "@/components/cho-neo/ChoNeoCommunityNoteRoom";

export default function ChoNeoShowOffPage() {
  return (
    <ChoNeoCommunityNoteRoom
      roomId="show-off-gallery"
      viTitle="Khoe Set Đẹp"
      enTitle="Show-Off Gallery"
      purpose="Một phòng để khoe set đẹp, góc tiệm, và thành quả nhỏ trong ngày."
      prompts={[]}
      placeholder=""
      guardrails={[]}
      tone="market"
      locked
      previewScale="large"
      previewImage="/images/cho-neo/khoe-set-gallery-hero-v1.png"
      previewNoteTitle="Phòng Trưng Bày đang lên đèn."
      previewNoteBody="Khoe Set sẽ mở khi làng sẵn sàng nhận hình và câu chuyện đẹp một cách an toàn."
      lockedMessage="Phòng này đang được giữ lại cho đúng thứ tự."
      lockedDetail="Khoe Set chưa thuộc vòng mở 24/7 đầu tiên. Ghé Quán Tám hoặc Bàn Ông Địa trước nha."
      showPreviewPrompts={false}
    />
  );
}
