import { IMAGE_CLASS } from "../Avatar/constants";

interface IPlaceholderAvatar {
  className?: string;
}

export const PlaceholderAvatar = ({ className }: IPlaceholderAvatar) => (
  <div
    className={`flex justify-center items-center gap-x-1 text-center text-sm ${IMAGE_CLASS} ${className}`}
  >
    <div>+</div>
    <div>photo</div>
  </div>
);
