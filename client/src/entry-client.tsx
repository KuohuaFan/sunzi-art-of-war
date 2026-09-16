import { HydrationBoundary, QueryClient, QueryClientProvider, type DehydratedState } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { hydrateRoot } from "react-dom/client";
import superjson from "superjson";
import { Router } from "wouter";
import { trpc } from "@/lib/trpc";
import { APP_BASE_PATH, joinBasePath } from "@/lib/runtime";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

declare global {
  interface Window {
    __RQ_STATE__?: Parameters<typeof superjson.deserialize>[0];
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: joinBasePath("/api/trpc"),
      transformer: superjson,
      headers() {
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(value => value.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) return { Authorization: `Bearer ${token}` };
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
      },
    }),
  ],
});

const dehydratedState = window.__RQ_STATE__
  ? superjson.deserialize(window.__RQ_STATE__) as DehydratedState
  : undefined;
const root = document.getElementById("root")!;

hydrateRoot(
  root,
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <Router base={APP_BASE_PATH || undefined}>
          <App />
        </Router>
      </HydrationBoundary>
    </QueryClientProvider>
  </trpc.Provider>,
);
