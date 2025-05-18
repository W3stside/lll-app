import Image from "next/image";

import type { IBaseDialogVariationProps } from "../types";

import warning from "@/assets/warning.png";

export function CancelDialog({
  content,
  action,
  cancel,
}: IBaseDialogVariationProps) {
  return (
    <div className="flex flex-col gap-y-10 justify-center items-center h-full">
      <div className="flex gap-x-6 items-start">
        <Image src={warning} alt="warning" width={60} height={60} />
        {content}
      </div>
      <div className="flex gap-x-6 mt-auto justify-center items-center">
        <button onClick={action}>Yes, cancel</button>
        <button onClick={cancel} className="bg-[var(--background-color-2)]">
          Go back
        </button>
      </div>
    </div>
  );
}
