import { useMemo } from "react";

import { Dialog } from "./Dialog";
import { CancelDialog } from "./variations/CancelDialog";
import { ConfirmDialog } from "./variations/ConfirmDialog";

import { DialogVariant, useDialog } from "@/context/Dialog/context";

export function VariantDialog() {
  const { title, variant, openDialog, ...restProps } = useDialog();

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
        content={<Variant {...restProps} cancel={openDialog} />}
      />
    );
  }, [openDialog, restProps, title, variant]);
}
