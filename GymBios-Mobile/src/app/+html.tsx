import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file customizes the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not
 * have access to the DOM or browser-specific APIs.
 */
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

        {/*
          Disable body scrolling on web. This makes ScrollView components
          use their native scroll instead, which is the only scrollbar
          that should ever be visible. Without this, the outer HTML
          document also scrolls, and the browser reserves extra width for
          its own scrollbar track — which is the "gap" you were seeing on
          any screen tall enough to need scrolling.
        */}
        <ScrollViewStyleReset />

        {/* Avoid a flash of unstyled background on load. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;