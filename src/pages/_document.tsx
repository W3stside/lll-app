import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Tab icon. Bump ?v= when it changes: browsers cache favicons hard */}
        <link rel="icon" href="/favicon.ico?v=2" sizes="48x48" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icons/favicon-32.png?v=2"
        />
        {/* PWA: makes the site installable, which iOS requires for push */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#028383" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="LLL" />
      </Head>
      <body className="light-theme transition-colors duration-500 ease-in-out">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
