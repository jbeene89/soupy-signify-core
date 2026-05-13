import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Soupy Together — Cost-disciplined AI orchestration" },
      { name: "description", content: "SACE routes each AI coding task to the cheapest tool that can do it well. $29/month plus only what you actually use." },
      { name: "author", content: "Soupy Lab LLC" },
      { property: "og:site_name", content: "Soupy Together" },
      { property: "og:title", content: "Soupy Together — Cost-disciplined AI orchestration" },
      { property: "og:description", content: "SACE routes each AI coding task to the cheapest tool that can do it well." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Soupy Together — Cost-disciplined AI orchestration" },
      { name: "twitter:description", content: "SACE routes each AI coding task to the cheapest tool that can do it well." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0724c1d2-594c-45dd-b97b-017c5b7aa33f" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0724c1d2-594c-45dd-b97b-017c5b7aa33f" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Source+Serif+4:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Soupy Lab LLC",
              url: "https://soupytogether.com",
              brand: "Soupy Together",
            },
            {
              "@type": "WebSite",
              name: "Soupy Together",
              url: "https://soupytogether.com",
              description: "Cost-disciplined multi-agent orchestration for AI coding.",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
