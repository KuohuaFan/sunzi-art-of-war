import type { QueryClient } from "@tanstack/react-query";
import { seoForPath, type SunziHeadMeta } from "@shared/sunzi-seo";

export type HeadMeta = SunziHeadMeta;
export type SsrPrefetch = Record<string, never>;

export async function prefetchForPath(url: string, _queryClient: QueryClient, _prefetch: SsrPrefetch): Promise<HeadMeta> {
  return seoForPath(url);
}
