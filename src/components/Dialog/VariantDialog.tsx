import { useMemo } from "react";

import { Dialog } from "./Dialog";
import { CancelDialog } from "./variations/CancelDialog";
import { ConfirmDialog } from "./variations/ConfirmDialog";

import { DialogVariant, useDialog } from "@/context/Dialog/context";

export function VariantDialog() {
  const { title, content, variant, action, openDialog } = useDialog();

  return useMemo(() => {
    let Variant = undefined;
    switch (variant) {
      case DialogVariant.CANCEL:
        Variant = CancelDialog;
        break;
      case DialogVariant.CONFIRM:
        Variant = ConfirmDialog;
        break;
      default:
        break;
    }

    if (Variant === undefined) return null;

    return (
      <Dialog
        trigger={null}
        title={title}
        content={
          <Variant
            content={content}
            action={action}
            cancel={() => {
              openDialog();
            }}
          />
        }
      />
    );
  }, [action, content, openDialog, title, variant]);
}
