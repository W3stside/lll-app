import { RED_TW } from "@/constants/colours";
import { type IDialogContext, DialogVariant } from "@/context/Dialog/context";
import type { IAdmin } from "@/types";
import { cn } from "@/utils/tailwind";

interface SignupsManagementProps {
  admin: IAdmin | undefined;
  loading: boolean;
  openDialog: IDialogContext["openDialog"];
  handleClearAllSignups: () => Promise<void>;
  handleToggleSignupsAvailable: (
    ev: React.MouseEvent<HTMLButtonElement>,
  ) => Promise<void>;
}

export function SignupsManagement({
  admin,
  loading,
  openDialog,
  handleClearAllSignups,
  handleToggleSignupsAvailable,
}: SignupsManagementProps) {
  if (admin === undefined) return null;

  return (
    <div className="flex flex-col gap-y-1 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5 py-2 !text-xl md:!text-2xl">
        Game and signups management
      </div>
      <div className="flex flex-col justify-start p-2">
        <div className="flex flex-wrap gap-2 items-center justify-between py-1">
          <div className="my-2 flex gap-x-4">
            <strong>Signups enabled?</strong>{" "}
            <div
              className={cn("font-bold", {
                "text-red-700": !admin.signup_open,
                "text-green-700": admin.signup_open,
              })}
            >
              {admin.signup_open ? "ENABLED" : "DISABLED"}
            </div>
          </div>
          <button
            onClick={handleToggleSignupsAvailable}
            className="!max-w-none w-[90px] justify-center"
            disabled={loading}
          >
            {admin.signup_open ? "Disable" : "Enable"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-between py-1">
          <div className="my-2 flex gap-x-4">
            <strong>Clear all game signups:</strong>{" "}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDialog({
                variant: DialogVariant.CONFIRM,
                title: "Careful!",
                content: (
                  <div>
                    Are you sure you want to remove all players from signups?
                    This action cannot be undone. <br />
                    <br />
                    You should really only be doing this on Sunday night after
                    the last game has been played and when preparing next week's
                    games.
                  </div>
                ),
                action: async () => {
                  await handleClearAllSignups();
                  openDialog();
                },
              });
            }}
            className={`!max-w-none w-max ${RED_TW}`}
            disabled={loading}
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
