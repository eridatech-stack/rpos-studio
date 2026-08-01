import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "RPOS Studio",
  description: "AI-assisted publishing operating system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const removeInjectedAttributes = () => {
                  document
                    .querySelectorAll("[fdprocessedid]")
                    .forEach((element) => {
                      element.removeAttribute("fdprocessedid");
                    });
                };

                removeInjectedAttributes();

                const observer = new MutationObserver(() => {
                  removeInjectedAttributes();
                });

                observer.observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                  attributeFilter: ["fdprocessedid"],
                });
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
