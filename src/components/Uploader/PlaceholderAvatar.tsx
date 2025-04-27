import dynamic from "next/dynamic";

import { IMAGE_CLASS } from "../Avatar/constants";

import { cn } from "@/utils/tailwind";

interface IPlaceholderAvatar {
  className?: string;
}

const PLACEHOLDER_LENNIES = [
  "╬ಠ益ಠ",
  "╬ಠ_ಠ",
  "╬ಠ⌣ಠ",
  "╬ಠ╭╮ಠ",
  "╬ಠ o ಠ",
  "╬ಠ ~ ಠ",
  "╬ಥ_ಥ",
  "╬ಥ⌣ಥ",
  "╬ಥ o ಥ",
  "(╬ಠ益ಠ)",
  "(°□°）╯",
  "ಥ_ಥ",
  "(⌐□_□)",
  "◕ ‿ ↼",
  "(¬‿¬)",
  "(｢•-•)｢",
];

const getRandomLenny = () => {
  const randomIndex = Math.floor(Math.random() * PLACEHOLDER_LENNIES.length);
  return PLACEHOLDER_LENNIES[randomIndex];
};

const DynamicPlaceholderAvatar = ({ className }: IPlaceholderAvatar) => (
  <div
    className={cn(
      IMAGE_CLASS,
      "flex justify-center items-center gap-x-1 text-center bg-white text-md w-[60px] h-[60px] md:text-lg md:w-[80px] md:h-[80px] shrink-0 border-black ",
      className,
    )}
  >
    {getRandomLenny()}
  </div>
);

export const PlaceholderAvatar = dynamic(
  async () => await Promise.resolve(DynamicPlaceholderAvatar),
  { ssr: false },
);
