import type { IBaseDialogVariationProps } from "../types";

export function ConfirmDialog({
  content = <h5>Are you sure you want to continue?</h5>,
  loading = false,
  action,
  cancel,
}: IBaseDialogVariationProps) {
  return (
    <div className="flex flex-col gap-y-10 justify-center items-center h-full">
      <div>{content}</div>
      <div className="flex gap-x-6 mt-auto justify-center items-center">
        <button disabled={loading} className="bg-[#8dc09f]" onClick={action}>
          Confirm
        </button>
        <button
          disabled={loading}
          className="bg-[var(--background-color-2)]"
          onClick={cancel}
        >
          Go back
        </button>
      </div>
    </div>
  );
}
