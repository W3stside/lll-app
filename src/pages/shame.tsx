import type { GetServerSideProps } from "next";

import client from "../lib/mongodb";

import { Signees } from "@/components/Signup";
import type { Signup } from "@/types/signups";

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    await client.connect();

    const db = client.db("LLL");
    const shamers = await db
      .collection<Signup>("wall-of-shame")
      .find({})
      .limit(100)
      .toArray();

    return {
      props: {
        shamers: JSON.parse(JSON.stringify(shamers)) as string,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return { props: { shamers: [] } };
  }
};

interface IWallOfShame {
  shamers: Signup[];
}

export default function WallOfShame({ shamers }: IWallOfShame) {
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
      <div className="flex flex-col gap-y-6 px-5 !pt-5 w-full container h-full">
        {shamers.length === 0 ? (
          <h4 className="p-6 mb-2 m-auto">No sinners found :)</h4>
        ) : (
          shamers.map((shamer) => (
            <Signees key={shamer._id} {...shamer}>
              <p>Times: 3x</p>
            </Signees>
          ))
        )}
      </div>
    </>
  );
}
