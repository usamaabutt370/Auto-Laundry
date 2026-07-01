import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/** Root HTML document for web export (full viewport). */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                width: 100%;
                margin: 0;
                padding: 0;
                background-color: #3b7f95;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              }
              /* RN Web renders TextInput as <input>; remove default browser box/outline */
              input,
              textarea {
                outline: none;
                box-shadow: none;
              }
              input:focus,
              textarea:focus {
                outline: none;
                box-shadow: none;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
