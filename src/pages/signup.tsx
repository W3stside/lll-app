import type { GetServerSideProps } from "next";
import Image from "next/image";
import { useCallback, useState } from "react";

import clientPromise from "../lib/mongodb";

import logo from "@/assets/logo.png";
import { SignupForm, Signees } from "@/components/Signup";
import { Collapsible } from "@/components/ui";
import {
  AVAILABLE_GAMES,
  MAX_SIGNUPS,
  PHONE_MIN_LENGTH,
} from "@/constants/signups";
import type { Signup } from "@/types/signups";
import { dbRequest } from "@/utils/dbRequest";
import { cn } from "@/utils/tailwind";

interface ISignups {
  signups: Signup[];
}

const NEXT_GAME_DATE = new Date("2025-04-18T20:00:00Z");

const Signups: React.FC<ISignups> = ({ signups: signupsInitialState }) => {
  const [loading, setLoading] = useState(false);
  const [signups, setSignups] = useState(signupsInitialState);

  const [firstName, fnSetter] = useState("");
  const [lastName, lnSetter] = useState("");
  const [phone, pnSetter] = useState<number | undefined>();

  const [collapsed, setCollapse] = useState<Record<string, boolean>>(
    Object.keys(AVAILABLE_GAMES).reduce(
      (acc, day) => ({
        ...acc,
        [day]: true,
      }),
      {},
    ),
  );

  const handleSignUp = useCallback(async (request: Omit<Signup, "_id">) => {
    setLoading(true);
    try {
      await dbRequest("create", request);
      const { data } = await dbRequest<Signup[]>("get");
      setSignups(data);
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : "Unknown error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidSignup =
    !firstName ||
    phone === undefined ||
    phone.toString().length < PHONE_MIN_LENGTH;

  const handleSignup = useCallback(async () => {
    if (invalidSignup) return;

    await handleSignUp({
      game_id: "1",
      first_name: firstName,
      last_name: lastName,
      phone_number: phone.toString(),
      date: NEXT_GAME_DATE,
    });
  }, [firstName, handleSignUp, invalidSignup, lastName, phone]);

  return (
    <div className="flex flex-col gap-y-8 items-center justify-start pb-10">
      <div className="flex container-header w-full gap-4 !h-auto !justify-start">
        <Image src={logo} alt="LLL logo" className="max-w-25" />
        <h1>Signups</h1>
        <h1 className="ml-auto pr-4">x</h1>
      </div>
      <div className="flex flex-col gap-y-6 px-5 w-full">
        {Object.entries(AVAILABLE_GAMES).map(([day, games]) => (
          <Collapsible
            key={day}
            className="flex flex-col items-center justify-start w-full px-5"
            collapsedClassName="container"
            collapsedHeight={105}
            customState={collapsed[day]}
          >
            <div
              className={cn(
                "flex flex-col mb-3 h-auto w-full border-4 border-white border-b-0 p-6 gap-y-2 cursor-pointer",
                {
                  "p-2 border-0": collapsed[day],
                },
              )}
              onClick={() => {
                setCollapse((prev) => ({
                  ...prev,
                  [day]: !prev[day],
                }));
              }}
            >
              <div className="flex items-center justify-start gap-4">
                <h2 className="font-bold">{collapsed[day] ? "+" : "-"}</h2>
                <div className="flex items-center w-full text-3xl">
                  {day}:{" "}
                  <strong className="ml-auto">
                    {games.length} {games.length > 1 ? "games" : "game"}
                  </strong>
                </div>
              </div>
              <div className="flex items-center pl-9 w-full text-xl">
                Remaining spots:{" "}
                <div
                  className={cn("inline-flex ml-auto p-2 px-4", {
                    "bg-green-300": signups.length < MAX_SIGNUPS,
                    "bg-orange-300": MAX_SIGNUPS - signups.length <= 5,
                    "bg-red-500": MAX_SIGNUPS - signups.length <= 0,
                  })}
                >
                  {MAX_SIGNUPS - signups.length} / {MAX_SIGNUPS}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-y-2 justify-start w-full">
              <h4>Available games</h4>
              {games.map((game) => (
                <Collapsible
                  collapsedHeight={105}
                  key={game.id}
                  className="flex flex-row flex-wrap items-center container gap-x-4 pl-9 w-full"
                >
                  Game {game.id}:{" "}
                  <strong className="ml-auto whitespace-nowrap">
                    {game.location}
                  </strong>
                  <strong className="ml-auto">{game.time}</strong>{" "}
                </Collapsible>
              ))}
            </div>

            <div className="flex flex-col items-center py-2 px-4 gap-y-2 w-full lg:w-[350px no-scrollbar mb-10">
              {signups.map((signup) => (
                <Signees key={signup._id} {...signup} setSignups={setSignups} />
              ))}
            </div>

            <div className="flex flex-col items-center mt-auto mb-8 w-full gap-y-6">
              <SignupForm
                firstNameStore={[firstName, fnSetter]}
                lastNameStore={[lastName, lnSetter]}
                phoneStore={[phone, pnSetter]}
              />
              <button
                className="w-full lg:w-[350px] text-2xl p-4 justify-center"
                disabled={loading || invalidSignup}
                onClick={handleSignup}
              >
                {!loading ? "Sign up" : "Signing up..."}
              </button>
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default Signups;

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const client = clientPromise;
    const db = client.db("LLL");
    const signups = await db
      .collection("signups")
      .find({})
      .limit(MAX_SIGNUPS)
      .toArray();
    return {
      props: { signups: JSON.parse(JSON.stringify(signups)) as string },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return { props: { signups: [] } };
  }
};
