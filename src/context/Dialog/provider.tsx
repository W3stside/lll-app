import { useCallback, useState } from "react";

import {
  DialogContext,
  type IDialogContext,
  type DialogVariant,
} from "./context";

interface IDialogProvider {
  children: React.ReactNode;
}

export function DialogProvider({ children }: IDialogProvider) {
  const [variant, setVariant] = useState<DialogVariant | undefined>(undefined);
  const [action, setAction] = useState<IDialogContext["action"] | undefined>(
    undefined,
  );
  const [title, setTitle] = useState<IDialogContext["title"] | undefined>(
    undefined,
  );
  const [content, setContent] = useState<IDialogContext["content"] | undefined>(
    undefined,
  );
  const [confirmLabel, setConfirmLabel] = useState<
    IDialogContext["confirmLabel"] | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);

  const openDialog: IDialogContext["openDialog"] = useCallback((props) => {
    setVariant(props?.variant);
    setTitle(props?.title);
    setContent(props?.content);
    setConfirmLabel(props?.confirmLabel);
    setAction(() => props?.action);
    setLoading(props?.loading ?? false);
  }, []);

  const handleAction = useCallback(async () => {
    try {
      setLoading(true);
      await action?.();
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Unknown error occured!");
    } finally {
      setLoading(false);
    }
  }, [action]);

  return (
    <DialogContext.Provider
      value={{
        action: handleAction,
        title,
        confirmLabel,
        content,
        variant,
        loading,
        openDialog,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}
