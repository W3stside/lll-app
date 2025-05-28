import Image from "next/image";

import type { IBaseDialogVariationProps } from "../types";

import warning from "@/assets/warning.png";

export function CancelDialog({
  content,
  confirmLabel = "Yes, cancel",
  loading = false,
  action,
  cancel,
}: IBaseDialogVariationProps) {
  return (
    <div className="flex flex-col gap-y-10 justify-center items-center h-full">
      <Image
        src={warning}
        alt="warning"
        width={60}
        height={60}
        className="w-[52px] h-[52px] lg:hidden -mb-5"
      />
      <div className="flex gap-x-6 justify-center lg:justify-start lg:self-start w-[85%] lg:w-full">
        <Image
          src={warning}
          alt="warning"
          width={100}
          height={100}
          className="w-[52px] h-[52px] hidden lg:flex"
        />
        {content}
      </div>
      <div className="flex gap-x-6 mt-auto justify-center items-center">
        <button disabled={loading} onClick={action}>
          {confirmLabel}
        </button>
        <button
          disabled={loading}
          onClick={cancel}
          className="bg-[var(--background-color-2)]"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
