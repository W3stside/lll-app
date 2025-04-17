import { useCallback } from "react";

import type { Signup } from "@/types/signups";
import { dbRequest } from "@/utils/dbRequest";
import { cn } from "@/utils/tailwind";

export function Signees({
  _id,
  first_name,
  last_name,
  phone_number,
  setSignups,
}: Signup & { setSignups: (signups: Signup[]) => void }) {
  const handleCancel = useCallback(async () => {
    await dbRequest("delete", { _id });
    const { data } = await dbRequest<Signup[]>("get");
    setSignups(data);
  }, [_id, setSignups]);

  return (
    <div
      className={cn(
        "container flex-col items-start justify-start gap-y-1 h-auto elevation-2",
      )}
    >
      <div className="container-header w-[calc(100%+12px)] -mt-2 -ml-2">x</div>
      <div className="flex justify-between items-center w-full py-2 px-4 text-2xl">
        {first_name} {last_name ?? "--"} - {phone_number}
        <button className="self-end" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
