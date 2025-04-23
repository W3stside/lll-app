import type { IBaseDialogVariationProps } from "../types";

export function ConfirmDialog({ action, cancel }: IBaseDialogVariationProps) {
  return (
    <div className="flex flex-col gap-y-4 justify-center items-center h-full">
      <h3>Are you sure you want to continue?</h3>
      <div className="flex gap-x-2 justify-center items-center">
        <button onClick={action}>Confirm</button>
        <button onClick={cancel}>Go back</button>
      </div>
    </div>
  );
}
