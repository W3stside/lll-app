import {
  type DialogContentProps,
  Content,
  Portal,
  Overlay,
  Root,
  Trigger,
  type DialogProps,
  Title,
} from "@radix-ui/react-dialog";

import { useDialog } from "@/context/Dialog/context";

interface IDialog extends DialogProps {
  title?: string;
  trigger: React.ReactNode;
  content: React.ReactNode;
  contentProps?: DialogContentProps;
}

interface IDialogContent extends DialogContentProps {
  closeModal: () => void;
}

function DialogContent({
  children,
  title,
  closeModal,
  ...props
}: IDialogContent) {
  return (
    <Portal>
      <Overlay />
      <Content
        className="flex flex-col justify-center items-center fixed top-0 left-0 w-screen h-screen px-6 bg-[#00000038] z-90"
        {...props}
      >
        <div className="container flex flex-col min-h-50 mb-[20%]">
          <div className="container-header !h-auto -mt-2 -mx-1.5 items-center gap-4 px-[8px] !justify-between">
            <h5>{title}</h5>
            <div
              className="cursor-pointer p-1 pt-1.5 font-bold"
              onClick={closeModal}
            >
              <h5>X</h5>
            </div>
          </div>
          <div className="flex flex-col p-4 h-full">{children}</div>
        </div>
      </Content>
    </Portal>
  );
}

export function Dialog({
  trigger,
  content,
  title,
  contentProps,
  ...props
}: IDialog) {
  const { openDialog } = useDialog();

  return (
    <Root {...props} open>
      <Title className="hidden" />
      {trigger !== null && <Trigger>{trigger}</Trigger>}
      <DialogContent
        aria-describedby="dialog-description"
        {...contentProps}
        closeModal={() => {
          openDialog(undefined);
        }}
        title={title}
      >
        {content}
      </DialogContent>
    </Root>
  );
}
