import type { IBaseDialogVariationProps } from "../types";

export function CancelDialog({
  content,
  action,
  cancel,
}: IBaseDialogVariationProps) {
  return (
    <div className="flex flex-col gap-y-10 justify-center items-center h-full">
      <div>{content}</div>
      <div className="flex gap-x-6 mt-auto justify-center items-center">
        <button onClick={action}>Yes, cancel</button>
        <button onClick={cancel}>Go back</button>
      </div>
    </div>
  );
}
