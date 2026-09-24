import { RED_TW } from "@/constants/colours";
import { GAME_PRICE_EUR } from "@/constants/signups";
import type { IUser } from "@/types";

interface IPaymentsDue {
  missedPayments: NonNullable<IUser["missedPayments"]>;
  isOwner: boolean;
  firstName: string;
}

// Only shown to the player and to admins: the ledger admins keep in "Players
// in debt"
export function PaymentsDue({
  missedPayments,
  isOwner,
  firstName,
}: IPaymentsDue) {
  const count = missedPayments.length;

  return (
    <div className="flex flex-col gap-y-3 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <div className="mr-auto px-2 py-1">Payments</div> X
      </div>
      <div className="flex flex-col gap-y-2 px-2 py-2">
        {count === 0 ? (
          <p>✅ {isOwner ? "You're" : `${firstName} is`} all paid up.</p>
        ) : (
          <>
            <p className={`px-2 py-1 font-bold ${RED_TW}`}>
              {isOwner ? "You owe" : `${firstName} owes`} €
              {count * GAME_PRICE_EUR} for {count}{" "}
              {count === 1 ? "game" : "games"}
            </p>
            <ul className="list-disc ml-5 text-sm">
              {missedPayments.map(({ _id, date, day, time }) => (
                <li key={`${String(_id)}-${date}`}>
                  {/* The date part of formatDateStr's "dd/mm/yyyy, hh:mm..." */}
                  {day} {date.split(",")[0]} @ {time}
                </li>
              ))}
            </ul>
            {isOwner && (
              <small>
                Pay an organiser in cash at your next game (€{GAME_PRICE_EUR}{" "}
                per game). They&apos;ll clear it here once it&apos;s paid.
              </small>
            )}
          </>
        )}
      </div>
    </div>
  );
}
