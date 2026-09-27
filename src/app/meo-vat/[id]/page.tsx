import { ChoNeoMeoVatDetail } from "@/components/cho-neo/ChoNeoMeoVatDetail";

export default async function MeoVatTipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChoNeoMeoVatDetail tipId={id} />;
}
