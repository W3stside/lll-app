import type { GetServerSideProps } from "next";

import { PartnerProducts } from "@/components/PartnerProducts";
import { Uploader } from "@/components/Uploader";
import { NAVLINKS_MAP } from "@/constants/links";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import type { IUser } from "@/types/users";

type ConnectionStatus = {
  isConnected: boolean;
};

export const getServerSideProps: GetServerSideProps<ConnectionStatus> = async (
  context,
) => {
  try {
    const { req } = context;
    const { token } = req.cookies;
    const user =
      token !== undefined
        ? verifyToken<IUser>(token, JWT_SECRET as string, JWT_REFRESH_SECRET)
        : null;

    if (user === null) {
      return {
        redirect: {
          destination: NAVLINKS_MAP.LOGIN,
          permanent: false,
        },
      };
    }

    await client.connect();

    return {
      props: {
        isConnected: true,
        user: JSON.parse(JSON.stringify(user)) as string,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {
      props: { isConnected: false, user: null },
    };
  }
};

interface IProfile {
  isConnected: boolean;
  user: IUser;
}

export default function About({ isConnected, user }: IProfile) {
  if (!isConnected) return <h1>Connecting to db...</h1>;

  return (
    <div className="flex flex-col gap-y-5 min-h-[60vh] justify-between">
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h4 className="mr-auto px-2 py-1">My profile</h4> X
        </div>
        <div className="px-2 py-2">
          Hey {user.first_name}! <br />
          <br />
          Welcome to your profile page :)
        </div>
      </div>
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <div className="mr-auto px-2 py-1">Profile photo</div> X
        </div>
        <div className="px-2 py-2">
          Upload a new profile photo. Max size 1mb!
          <Uploader />
        </div>
      </div>
      <PartnerProducts className="mt-20" />
    </div>
  );
}
