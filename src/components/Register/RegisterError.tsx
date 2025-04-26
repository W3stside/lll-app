import { GREEN_TW, RED_TW } from "@/constants/colours";
import { cn } from "@/utils/tailwind";

interface IRegisterError {
  property: string;
  validator: {
    VALID: string;
    TOO_SHORT: (property: string) => string;
  };
  status: string | null;
}

export const RegisterError = ({
  property,
  validator,
  status,
}: IRegisterError) => (
  <div
    className={cn(
      "overflow-hidden transition-all duration-200 h-[35.5px] my-1 mx-0.5 ml-auto max-w-[212px] px-2 py-1 text-[11px] absolute right-0 flex items-center justify-end",
      {
        "text-transparent px-0 w-0": property === "",
        [GREEN_TW]: status === validator.VALID,
        [RED_TW]: status === validator.TOO_SHORT(property),
      },
    )}
  >
    {status}
  </div>
);
