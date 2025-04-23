import type { AppProps } from "next/app";

import { VariantDialog } from "@/components/Dialog/VariantDialog";
import { Layout } from "@/components/layout";
import "@/styles/globals.css";
import { DialogProvider } from "@/context/Dialog/provider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <DialogProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <VariantDialog />
    </DialogProvider>
  );
}
