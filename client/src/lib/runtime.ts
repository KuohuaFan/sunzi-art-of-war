const configuredBase = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");

export const APP_BASE_PATH = configuredBase === "/" ? "" : configuredBase;
export const IS_STATIC_EXPORT = import.meta.env.VITE_STATIC_EXPORT === "true";
export const FULL_APP_ORIGIN = "https://sunziaow.manus.space";

export function joinBasePath(pathname: string, basePath = APP_BASE_PATH) {
  if (/^(?:https?:)?\/\//i.test(pathname) || pathname.startsWith("mailto:")) return pathname;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!basePath) return normalized;
  if (normalized === "/") return `${basePath}/`;
  return `${basePath}${normalized}`;
}

export function fullAppPath(pathname = "/") {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${FULL_APP_ORIGIN}${normalized}`;
}

export function stripBasePath(pathname: string, basePath = APP_BASE_PATH) {
  if (!basePath) return pathname || "/";
  if (pathname === basePath) return "/";
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || "/";
  return pathname || "/";
}
