import { useCallback, useMemo } from "react";

import { FilterStuff, FilterType } from "../FilterStuff";
import { SigneeComponent } from "../Signup/SIgnees/SigneeComponent";
import { Collapsible } from "../ui";

import { RED_TW } from "@/constants/colours";
import { DialogVariant, type useDialog } from "@/context/Dialog/context";
import { useSearchFilter } from "@/hooks/useSearchFilter";
import type { IUserSafe } from "@/types";
import { filterUser } from "@/utils/filter";

const GOD_ID = process.env.NEXT_PUBLIC_GOD_ID;

interface IFindAndDeletePlayer {
  users: IUserSafe[];
  openDialog: ReturnType<typeof useDialog>["openDialog"];
  handleDeletePlayer: (userToDelete: IUserSafe | undefined) => Promise<void>;
}

export function FindAndDeletePlayer({
  users,
  handleDeletePlayer,
  openDialog,
}: IFindAndDeletePlayer) {
  const { filters, searchFilter, searchFilterRaw, setSearchFilter, setFilter } =
    useSearchFilter();

  const filteredUsers = useMemo(
    () =>
      searchFilter === ""
        ? []
        : users.filter((u) => filterUser(u, searchFilter)),
    [users, searchFilter],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, user: IUserSafe) => {
      e.stopPropagation();

      if (user._id === undefined) return;

      openDialog({
        variant: DialogVariant.CONFIRM,
        title: "Careful!",
        content: (
          <div>
            Are you sure you want to delete this player? <br />
            <br />
            You should really only be doing this if someone forgot their
            password or they REALLY suck.
          </div>
        ),
        action: async () => {
          setSearchFilter("");
          await handleDeletePlayer(user);
          openDialog();
        },
      });
    },
    [handleDeletePlayer, openDialog, setSearchFilter],
  );

  return (
    <Collapsible
      className="flex flex-col gap-y-1 text-black container !px-0 !border-0"
      collapsedHeight={39}
      startCollapsed
    >
      <div className="container-header !h-auto -mt-2 mx-[2px] py-2 !text-xl md:!text-2xl">
        <small className="px-2 py-1 text-xs mr-auto">
          [+/-] <span className="hidden xl:inline">expand/minimise</span>
        </small>
        Find and delete player
      </div>
      <div className="container text-xs gap-x-4">
        <div className="flex-3">
          Find a player by their name or phone number and delete them.{" "}
          <b>Useful as a password "reset" of sorts.</b>
          <br />
          <br />
          Or to just yeet the fuckhead.
        </div>
      </div>
      <FilterStuff
        type={FilterType.USERS}
        name="Players"
        placeholder="Find user by name/number"
        filters={filters}
        setFilter={setFilter}
        searchFilter={searchFilterRaw}
        setSearchFilter={setSearchFilter}
        showHeader={false}
        showRadio={false}
        filterLabel={null}
      />
      {filteredUsers.map((user, idx) => (
        <SigneeComponent
          key={user._id?.toString() ?? idx}
          {...user}
          errorMsg={null}
          loading={false}
        >
          {user._id !== undefined && user._id.toString() !== GOD_ID && (
            <button
              className={RED_TW}
              onClick={(e) => {
                handleDelete(e, user);
              }}
            >
              <b>DELETE</b>
            </button>
          )}
        </SigneeComponent>
      ))}
    </Collapsible>
  );
}
