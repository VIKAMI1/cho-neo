export const VIKAMI_PILOT_COLLECTION_HANDLE = "vikami-pilot-selected-products";
export const VIKAMI_GREEN_PILOT_CAMPAIGN = "vikami-green-pilot-v1";

/**
 * Shopify is deliberately an explicit deployment setting. Keeping the URL
 * out of the component prevents a placeholder or a personal storefront from
 * becoming a public commercial destination by accident.
 */
export function getVikamiShopUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_VIKAMI_SHOP_URL?.trim();
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
