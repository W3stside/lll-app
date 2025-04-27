import type { AppProps } from "next/app";

import { VariantDialog } from "@/components/Dialog/VariantDialog";
import { Layout } from "@/components/layout";
import "@/styles/globals.css";
import { ActionProvider } from "@/context/Actions/provider";
import { DialogProvider } from "@/context/Dialog/provider";
import { GamesProvider } from "@/context/Games/provider";
import { UserProvider } from "@/context/User/provider";
import type { IUser, IGame } from "@/types/users";

interface IServerSideProps {
  user: IUser;
  games: IGame[];
  usersById: Record<string, IUser>;
}

export default function App({
  Component,
  pageProps,
}: AppProps<IServerSideProps>) {
  return (
    <UserProvider>
      <DialogProvider>
        <GamesProvider initialState={pageProps.games}>
          <ActionProvider>
            <Layout usersById={pageProps.usersById}>
              <Component {...pageProps} />
            </Layout>
            <VariantDialog />
          </ActionProvider>
        </GamesProvider>
      </DialogProvider>
    </UserProvider>
  );
}
