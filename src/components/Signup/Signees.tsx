import Link from "next/link";
import { useCallback, useState, type MouseEventHandler } from "react";

import { TWELVE_HOURS_MS } from "@/constants/date";
import { WHATS_APP } from "@/constants/links";
import { useStorageUser } from "@/hooks/useStorageUser";
import type { Signup } from "@/types/signups";
import { checkPlayerIsUser } from "@/utils/data";
import { dbRequest } from "@/utils/dbRequest";
import { cn } from "@/utils/tailwind";

interface ISignees extends Signup {
  children?: React.ReactNode;
  setSignups?: (signups: Signup[]) => void;
}

export function Signees({
  _id,
  first_name,
  last_name,
  phone_number,
  date,
  children,
  setSignups,
}: ISignees) {
  const [errorMsg, setError] = useState<string | null>(null);

  const user = useStorageUser();
  const isUser = checkPlayerIsUser(
    { first_name, last_name, phone_number },
    user,
  );

  const handleCancel: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation();

      void (async () => {
        try {
          setError(null);

          // eslint-disable-next-line no-alert
          if (!confirm("Are you sure you want to drop out?")) {
            return;
          }

          const gameMinusTwelveHours = Date.parse(date) - TWELVE_HOURS_MS;
          if (new Date() > new Date(gameMinusTwelveHours)) {
            // eslint-disable-next-line no-alert
            const response = prompt(
              `It's past the cancellation threshold of 12 hours. What are you doing!? 
              
Continue with cancellation: type "Yes, I'm a dumbass" and tap OK to continue.
              
Keep your spot: tap cancel.
              `,
            );
            if (response !== "Yes, I'm a dumbass") {
              throw new Error(
                "Good lad, now warm-up, sober up, and get ready to play.",
              );
            } else {
              await dbRequest("create", "wall-of-shame", {
                first_name,
                last_name,
                phone_number,
              });
            }
          }

          await dbRequest("delete", "signups", { _id });

          const { data } = await dbRequest<Signup[]>("get", "signups");
          setSignups?.(data);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred.";

          setError(errorMessage);
          throw new Error(errorMessage);
        }
      })();
    },
    [_id, date, first_name, last_name, phone_number, setSignups],
  );

  return (
    <div
      className={cn(
        "container flex-col items-start justify-start gap-y-1 h-auto elevation-2",
      )}
    >
      <div className="container-header w-[calc(100%+12px)] !bg-gray-800 -mt-2 -ml-2">
        <span className="cursor-pointer" onClick={handleCancel}>
          x
        </span>
      </div>
      <div className="flex justify-between items-center w-full py-2 px-4">
        <div className="flex flex-col items-start justify-center">
          <strong>
            {first_name} {last_name}
          </strong>{" "}
          <div className="text-sm text-gray-800">
            WhatsApp:{" "}
            <Link
              href={`${WHATS_APP}/${phone_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {phone_number}
            </Link>
          </div>
        </div>
        {isUser && setSignups !== undefined && (
          <button className="self-end" onClick={handleCancel}>
            Cancel
          </button>
        )}
        {children}
      </div>
      {errorMsg !== null && (
        <div className="p-2 w-full bg-gray-100 text-red-500 text-sm text-left break-all">
          Error cancelling! - {errorMsg}{" "}
        </div>
      )}
    </div>
  );
}
