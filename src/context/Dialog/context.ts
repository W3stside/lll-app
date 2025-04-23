import { type ReactNode, createContext, useContext } from "react";

export enum DialogVariant {
  CONFIRM = "CONFIRM",
  CANCEL = "CANCEL",
}

export interface IOpenDialog {
  variant?: DialogVariant;
  title?: string;
  content?: ReactNode;
  action?: (() => Promise<void>) | (() => void);
}

export interface IDialogContext extends IOpenDialog {
  openDialog: (props?: IOpenDialog) => void;
}

export const DialogContext = createContext<IDialogContext | undefined>(
  undefined,
);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error("useDialog must be used within a DialogProvider");
  }

  return context;
};
