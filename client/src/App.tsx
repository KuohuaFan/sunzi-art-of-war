import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IS_STATIC_EXPORT } from "@/lib/runtime";
import NotFound from "@/pages/NotFound";
import { isSunziLocale, type SunziLocale } from "@shared/sunzi-locales";
import { findChapterByRouteSlug } from "@shared/sunzi-seo";
import { Route, Switch, useRoute } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { Head } from "./components/Head";
import { ThemeProvider } from "./contexts/ThemeContext";
import Events from "./pages/Events";
import Home from "./pages/Home";
import { LocalizedChapter, LocalizedHome } from "./pages/LocalizedReader";
import StaticUnavailable from "./pages/StaticUnavailable";

function ChapterPage() {
  const [, params] = useRoute("/chapters/:slug");
  const chapter = findChapterByRouteSlug(params?.slug?.toLowerCase());
  return chapter ? <Home chapterSlug={params?.slug} /> : <NotFound />;
}

function LocalizedChapterPage() {
  const [, params] = useRoute("/:locale/chapters/:slug");
  const localeValue = params?.locale?.toLowerCase();
  const chapter = findChapterByRouteSlug(params?.slug?.toLowerCase());
  if (!isSunziLocale(localeValue) || !chapter) return <NotFound />;
  return <LocalizedChapter locale={localeValue as SunziLocale} chapterSlug={params!.slug} />;
}

function LocalizedHomePage() {
  const [, params] = useRoute("/:locale");
  const localeValue = params?.locale?.toLowerCase();
  return isSunziLocale(localeValue) ? <LocalizedHome locale={localeValue as SunziLocale} /> : <NotFound />;
}

function Router() {
  const EventPage = IS_STATIC_EXPORT ? StaticUnavailable : Events;
  return (
    <Switch>
      <Route path="/events/new" component={EventPage} />
      <Route path="/events/:id/edit" component={EventPage} />
      <Route path="/events/:id" component={EventPage} />
      <Route path="/events" component={EventPage} />
      <Route path="/:locale/chapters/:slug" component={LocalizedChapterPage} />
      <Route path="/chapters/:slug" component={ChapterPage} />
      <Route path="/:locale" component={LocalizedHomePage} />
      <Route path="/">{() => <Home />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Head />
          <Toaster position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
