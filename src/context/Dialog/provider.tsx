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

  const openDialog: IDialogContext["openDialog"] = useCallback((props) => {
    setVariant(props?.variant);
    setTitle(props?.title);
    setContent(props?.content);
    setAction(() => props?.action);
  }, []);

  return (
    <DialogContext.Provider
      value={{ action, title, content, variant, openDialog }}
    >
      {children}
    </DialogContext.Provider>
  );
}
