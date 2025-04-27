import type { GetServerSideProps } from "next";
import { useMemo } from "react";

import client from "../lib/mongodb";

import { PartnerProducts } from "@/components/PartnerProducts";
import { SigneeComponent } from "@/components/Signup/SIgnees/SigneeComponent";
import type { IGame, IUser } from "@/types/users";
import { fetchRequiredCollectionsFromMongoDb } from "@/utils/api/mongodb";

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const [games, users] = await fetchRequiredCollectionsFromMongoDb(client, {
      serialised: true,
    })();

    return {
      props: {
        games,
        users,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return { props: { users: [], games: [] } };
  }
};

interface IWallOfShame {
  users: IUser[];
  games: IGame[];
}

export default function WallOfShame({ users }: IWallOfShame) {
  const shamers = useMemo(
    () => users.flatMap((user) => [...user.shame]),
    [users],
  );

  return (
    <>
      <div className="flex flex-col flex-wrap gap-x-4 px-4 items-baseline justify-start">
        <div className="flex mb-4 text-6xl">
          <span className="text-7xl mb-2 mr-2">ಠ_ಠ</span>{" "}
          <span className="ml-6">BAH</span>
        </div>
        <div className="container flex-col">
          <div className="container-header !h-auto mb-2 -mt-2 -mx-1.5">x</div>
          Where the shameful players who drop out less than 12 hours before
          games are displayed for all of us to laugh at. Don't be like these
          people!
        </div>
      </div>
      {shamers.length > 0 ? (
        <div className="flex flex-col items-center gap-y-2">
          {users.flatMap((user) =>
            user.shame.length > 0
              ? [
                  <div key={user._id.toString()} className="w-[350px]">
                    <SigneeComponent
                      errorMsg={null}
                      loading={false}
                      avatarSize={70}
                      {...user}
                      className="py-[4px] px-[16px]"
                      childrenBelow={
                        <div className="flex flex-col w-full gap-y-1 mt-2">
                          <div className="flex items-center justify-between w-full">
                            Shameful proof{" "}
                            <div className="text-right ml-auto">
                              {user.shame.length}x shame
                            </div>
                          </div>
                          {user.shame.map(({ game_id, date }, idx) => {
                            return (
                              <div
                                key={game_id.toString()}
                                className="flex items-center justify-between w-full"
                              >
                                <span className="text-sm text-gray-800">
                                  {idx + 1}.{" "}
                                  <strong>Late cancel/no-show:</strong>{" "}
                                  {new Date(date).toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      }
                    ></SigneeComponent>
                  </div>,
                ]
              : [],
          )}
        </div>
      ) : (
        <div className="container !justify-center">
          <p className="">No sinners yet :)</p>
        </div>
      )}
      <PartnerProducts />
    </>
  );
}
