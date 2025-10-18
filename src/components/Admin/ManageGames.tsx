import type { MouseEventHandler } from "react";

import { Collapsible, Loader } from "../ui";
import { AdminError } from "./AdminError";
import { DEFAULT_GAME_STATE } from "./constants";
import type { ErrorUser } from "./types";

import { DAYS_IN_WEEK } from "@/constants/date";
import { DialogVariant } from "@/context/Dialog/context";
import { type PlaySpeed, type IGame, GameType, Gender } from "@/types";
import { cn } from "@/utils/tailwind";

const ADDRESS_MAX_LENGTH = 35;

interface IManageGames {
  sortedGames: IGame[];
  loading: boolean;
  targettedGame: Partial<IGame>;
  setGameInfo: React.Dispatch<React.SetStateAction<Partial<IGame>>>;
  handleRefreshGames: MouseEventHandler<HTMLButtonElement>;
  handleChange: (key: keyof ErrorUser, value: IGame[keyof ErrorUser]) => void;
  setAddGameError: React.Dispatch<
    React.SetStateAction<Record<string, string> | null>
  >;
  setGeneralError: React.Dispatch<React.SetStateAction<Error | null>>;
  openDialog: (options?: {
    variant?: DialogVariant;
    title?: string;
    content?: React.ReactNode;
    action?: () => Promise<void>;
  }) => void;
  handleUpdateGame: () => Promise<void>;
  addGameError: Record<string, string> | null;
  generalError: Error | null;
  startCollapsed?: boolean;
}

export function ManageGames({
  sortedGames,
  loading,
  targettedGame,
  setGameInfo,
  handleRefreshGames,
  handleChange,
  addGameError,
  setAddGameError,
  setGeneralError,
  generalError,
  openDialog,
  handleUpdateGame,
  startCollapsed = true,
}: IManageGames) {
  return (
    <Collapsible
      className="flex flex-col gap-y-1 text-black container !border-0"
      collapsedHeight={39}
      startCollapsed={startCollapsed}
    >
      <div className="container-header !h-auto -mt-2 -mx-1.5 py-2 !text-xl md:!text-2xl">
        <small className="px-2 py-1 text-xs mr-auto">
          [+/-] <span className="hidden xl:inline">expand/minimise</span>
        </small>
        Manage games
      </div>
      <div className="container text-xs">
        Manage games here. Clicking "edit" on a game will populate the form
        below with the game information, allowing you to edit it. To create a
        new new game either fill in the form when it's empty or click "reset" to
        reset the form and fill it in from scratch.
      </div>
      <Collapsible
        className="container my-2 flex flex-col gap-y-2 justify-start"
        collapsedHeight={70}
        startCollapsed={false}
      >
        <div className="container-header !h-auto -mt-2 -mx-1.5 !items-center">
          <small className="px-2 py-1 text-xs mr-auto">
            [+/-] expand/minimise
          </small>
          Games list
        </div>
        <div className="flex flex-col w-full gap-y-2 sm:gap-y-2 text-xs pt-3">
          {sortedGames.map((game) => (
            <div
              key={game._id.toString()}
              className={cn(
                "flex flex-row gap-x-5 justify-between items-center px-2 py-1",
                {
                  "bg-[var(--background-window-highlight)]": game.hidden,
                },
              )}
            >
              <div className="flex flex-[1_1_70%] justify-start gap-x-4">
                <div className="flex flex-col w-auto whitespace-preline">
                  <strong>
                    {game.day} @ {game.time}{" "}
                    {game.hidden === true && "(Hidden from users)"}
                  </strong>{" "}
                  {game.location}
                </div>
                <a
                  href={game.mapUrl}
                  target="_blank"
                  className="min-w-[100px] self-center text-right flex-1"
                >
                  {game.address.slice(0, ADDRESS_MAX_LENGTH)}...
                </a>
              </div>
              <button
                className="flex-[0_1_auto]"
                onClick={(e) => {
                  e.stopPropagation();
                  setGameInfo((prev) => ({ ...prev, ...game }));
                }}
              >
                edit
              </button>
            </div>
          ))}
          <button
            onClick={handleRefreshGames}
            className="text-xs mt-2 inline !w-max self-end bg-[var(--background-color-2)]"
          >
            Refresh games list
          </button>
        </div>
      </Collapsible>
      {!loading ? (
        <div className="container my-2 flex flex-col gap-y-2 justify-start">
          <div className="container-header !h-auto -mt-2 mx-[2px] !items-center">
            Edit/Create game
          </div>
          <div className="flex flex-col">
            <select
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={targettedGame.day}
              name="day-of-the-week"
              defaultValue={""}
              onChange={(e) => {
                handleChange("day", e.target.value as IGame["day"]);
              }}
            >
              <option value="">- Please select a day -</option>
              {DAYS_IN_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <select
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={targettedGame.type}
              name="type-of-game"
              defaultValue={GameType.STANDARD}
              onChange={(e) => {
                handleChange("type", e.target.value as GameType);
              }}
            >
              {Object.values(GameType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={targettedGame.time}
              onChange={(e) => {
                handleChange("time", e.target.value);
              }}
              placeholder="Time 24h format (e.g 19:00)"
            />
            <AdminError errors={addGameError} errorKey="time" />
            <input
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={targettedGame.location}
              onChange={(e) => {
                handleChange("location", e.target.value);
              }}
              placeholder="Location name (e.g Playarena Olais)"
            />
            <AdminError errors={addGameError} errorKey="location" />
            <input
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={targettedGame.address}
              onChange={(e) => {
                handleChange("address", e.target.value);
              }}
              placeholder="Address"
            />
            <AdminError errors={addGameError} errorKey="address" />
            <input
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={targettedGame.mapUrl}
              onChange={(e) => {
                handleChange("mapUrl", e.target.value);
              }}
              placeholder="Google Maps URL"
            />
            <AdminError errors={addGameError} errorKey="mapUrl" />
            <select
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={targettedGame.speed}
              name="game-speed"
              defaultValue="Mixed"
              onChange={(e) => {
                handleChange("speed", e.target.value as PlaySpeed);
              }}
            >
              <option value="faster">Faster</option>
              <option value="mixed">Mixed</option>
              <option value="slower">Slower</option>
            </select>
            <select
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={targettedGame.gender}
              name="gender"
              defaultValue={""}
              onChange={(e) => {
                handleChange("gender", e.target.value as Gender);
              }}
            >
              <option value="">- (optional) Ladies game? -</option>
              <option value={Gender.FEMALE}>Ladies</option>
            </select>
            <select
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={
                targettedGame.cancelled === true ? "cancelled" : "confirmed"
              }
              name="status"
              defaultValue=""
              onChange={(e) => {
                handleChange("cancelled", e.target.value === "cancelled");
              }}
            >
              <option value="">Status: Confirmed</option>
              <option value="cancelled">Status: Cancelled</option>
            </select>
            <select
              onClick={(e) => {
                e.stopPropagation();
              }}
              value={targettedGame.hidden === true ? "hidden" : "visible"}
              name="hidden"
              defaultValue="visible"
              onChange={(e) => {
                handleChange("hidden", e.target.value === "hidden");
              }}
            >
              <option value="visible"> View: Visible</option>
              <option value="hidden">View: Hidden</option>
            </select>
          </div>
        </div>
      ) : (
        <Loader className="w-full h-[300px]" />
      )}

      <div className="flex gap-x-2 items-center justify-between h-full mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDialog({
              variant: DialogVariant.CONFIRM,
              title: "Careful!",
              content: (
                <div>
                  Are you sure you want to update this game? Check that all the
                  fields are correct. <br />
                  <br />
                  Data has passed validation but click "Refresh games list"
                  above after confirming to make sure everything looks alright.
                </div>
              ),
              action: async () => {
                await handleUpdateGame();
                openDialog();
              },
            });
          }}
          className="flex justify-center w-full"
          disabled={
            loading ||
            targettedGame.day === undefined ||
            targettedGame.time === "" ||
            targettedGame.location === "" ||
            targettedGame.address === "" ||
            targettedGame.mapUrl === "" ||
            targettedGame.speed === undefined
          }
        >
          <strong>
            {targettedGame._id === undefined ? "Add new" : "Update"} game
          </strong>
        </button>
        <button
          className="bg-[var(--background-color-2)]"
          onClick={(e) => {
            e.stopPropagation();
            setGameInfo(DEFAULT_GAME_STATE);
            setAddGameError(null);
            setGeneralError(null);
          }}
        >
          reset
        </button>
      </div>
      {generalError !== null && (
        <span className="px-2 py-1 text-xs text-red-500">
          {generalError.message}
        </span>
      )}
    </Collapsible>
  );
}
