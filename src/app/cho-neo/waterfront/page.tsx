import { ChoNeoCommunityNoteRoom } from "@/components/cho-neo/ChoNeoCommunityNoteRoom";

export default function ChoNeoWaterfrontPage() {
  return (
    <ChoNeoCommunityNoteRoom
      roomId="waterfront"
      viTitle="Bến Nước"
      enTitle="Waterfront"
      purpose="Một bến yên để làng thở chậm, nhìn xa hơn, và mở những câu chuyện nhẹ."
      prompts={[]}
      placeholder=""
      guardrails={[]}
      tone="waterfront"
      locked
      previewScale="large"
      previewImage="/images/cho-neo/waterfront-locked-preview-16x9.png"
      previewNoteTitle="Nhìn ra bến nước."
      previewNoteBody="Bến đang lên đèn, chờ làng có thêm những câu chuyện nhẹ."
      lockedMessage="Bến này đang được giữ lại cho đúng thứ tự."
      lockedDetail="Bến Nước sẽ mở khi làng sẵn sàng có thêm những câu chuyện chậm và nhẹ."
      showPreviewPrompts={false}
    />
  );
}
