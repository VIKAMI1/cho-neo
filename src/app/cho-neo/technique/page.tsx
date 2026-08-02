import { ChoNeoCommunityNoteRoom } from "@/components/cho-neo/ChoNeoCommunityNoteRoom";

export default function ChoNeoTechniquePage() {
  return (
    <ChoNeoCommunityNoteRoom
      roomId="nail-tech-corner"
      viTitle="Góc Thợ Nail"
      enTitle="Nail Tech Corner"
      purpose="Một góc nhẹ để thợ nail kể chuyện nghề, xả áp lực, và giữ sự tôn trọng."
      prompts={[
        "Hôm nay ở tiệm có gì làm mình mệt?",
        "Có điều gì chủ, khách, hoặc đồng nghiệp nên hiểu hơn?",
        "Một điều nhỏ làm mình thấy được tôn trọng?",
      ]}
      placeholder="Viết một ghi chú nhẹ cho thợ nail khác..."
      guardrails={[
        "Không gọi tên người thật.",
        "Không lộ tên tiệm hay khách.",
        "Nói để nhẹ hơn, không để đánh nhau.",
      ]}
      tone="tech"
      locked
      previewScale="large"
      previewImage="/images/cho-neo/goc-tho-nail-locked-room-16x9.png"
    />
  );
}
