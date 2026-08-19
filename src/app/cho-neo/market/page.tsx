import { VikamiShopGate } from "@/components/cho-neo/VikamiShopGate";
import { getVikamiShopUrl } from "@/lib/cho-neo/vikami-shop";

export default function ChoNeoMarketPage() {
  return <VikamiShopGate shopUrl={getVikamiShopUrl()} />;
}
