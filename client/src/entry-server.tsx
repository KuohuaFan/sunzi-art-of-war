import { QueryClient, QueryClientProvider, dehydrate } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { renderToString } from "react-dom/server";
import superjson from "superjson";
import { Router } from "wouter";
import { trpc } from "@/lib/trpc";
import { joinBasePath, stripBasePath } from "@/lib/runtime";
import App from "./App";
import { prefetchForPath, type HeadMeta, type SsrPrefetch } from "./ssr/prefetch";

export type RenderResult = {
  html: string;
  dehydratedState: unknown;
  head: HeadMeta;
};

export async function render(url: string, prefetch: SsrPrefetch, basePath = ""): Promise<RenderResult> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  const queryIndex = url.indexOf("?");
  const ssrPath = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const ssrSearch = queryIndex === -1 ? "" : url.slice(queryIndex + 1);
  const head = await prefetchForPath(stripBasePath(url, basePath), queryClient, prefetch);
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: joinBasePath("/api/trpc", basePath), transformer: superjson })],
  });

  const html = renderToString(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router base={basePath || undefined} ssrPath={ssrPath} ssrSearch={ssrSearch}>
          <App />
        </Router>
      </QueryClientProvider>
    </trpc.Provider>,
  );

  return { html, dehydratedState: dehydrate(queryClient), head };
}
