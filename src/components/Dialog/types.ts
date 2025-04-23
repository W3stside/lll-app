import type { IOpenDialog } from "@/context/Dialog/context";

export interface IBaseDialogVariationProps
  extends Omit<IOpenDialog, "variant"> {
  cancel: () => void;
}
