import { ChoNeoCommunityNoteRoom } from "@/components/cho-neo/ChoNeoCommunityNoteRoom";

export default function ChoNeoMarketPage() {
  return (
    <ChoNeoCommunityNoteRoom
      roomId="market-street"
      viTitle="Phố Chợ"
      enTitle="Market Street"
      purpose="Một con phố nhỏ để làng mở thêm hàng quán, chuyện nghề, và những góc mới."
      prompts={[]}
      placeholder=""
      guardrails={[]}
      tone="market"
      locked
      previewScale="large"
      previewImage="/images/cho-neo/pho-cho-locked-preview-16x9.png"
      previewNoteTitle="Nhìn qua cổng chợ."
      previewNoteBody="Con phố đang được lên đèn cho đúng nhịp của làng."
      lockedMessage="Phố này đang được giữ lại cho đúng thứ tự."
      lockedDetail="Phố Chợ sẽ mở khi làng sẵn sàng có thêm hàng quán, chuyện nghề, và góc mới."
      showPreviewPrompts={false}
    />
  );
}
