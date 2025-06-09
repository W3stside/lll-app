import type { AppProps } from "next/app";

import { VariantDialog } from "@/components/Dialog/VariantDialog";
import { Layout } from "@/components/layout";
import "@/styles/globals.css";
import { ActionProvider } from "@/context/Actions/provider";
import { AdminProvider } from "@/context/Admin/provider";
import { DialogProvider } from "@/context/Dialog/provider";
import { GamesProvider } from "@/context/Games/provider";
import { UserProvider } from "@/context/User/provider";
import type { IUserSafe, IAdmin, IGame, IUser } from "@/types";

export interface IServerSideProps {
  admin: IAdmin;
  user: IUser;
  games: IGame[];
  users: IUser[];
  usersById: Record<string, IUserSafe>;
}

export default function App({
  Component,
  pageProps,
}: AppProps<IServerSideProps>) {
  return (
    <UserProvider
      initialState={pageProps.user}
      initialStateUsers={pageProps.users}
    >
      <DialogProvider>
        <GamesProvider initialState={pageProps.games}>
          <ActionProvider>
            <AdminProvider initialState={pageProps.admin}>
              <Layout usersById={pageProps.usersById}>
                <Component {...pageProps} />
              </Layout>
            </AdminProvider>
            <VariantDialog />
          </ActionProvider>
        </GamesProvider>
      </DialogProvider>
    </UserProvider>
  );
}
