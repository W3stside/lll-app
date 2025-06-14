"use client";
import Image from "next/image";
import Link from "next/link";

import error from "@/assets/error.png";
import question from "@/assets/question.png";
import { ImagePixelated } from "@/components/PixelatedImage";
import { RULEBOOK_URL, WHATS_APP_GROUP_URL } from "@/constants/links";

export default function ShadowRealm() {
  return (
    <div className="flex flex-col gap-y-1 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <h1 className="mr-auto px-2 py-1">SHADOW REALM</h1>{" "}
        <strong className="pr-2">x</strong>
      </div>
      <div>
        <h1 className="sr-only">You've been banned!</h1>
      </div>
      <div className="flex flex-col items-center justify-center gap-y-4 p-5">
        <ImagePixelated
          src={error.src}
          pixelSize={0}
          width={300}
          height={300}
          alt="error"
          className="w-[300px] h-[300px]"
        />
        <h1>You've been banned!</h1>
        <p>
          Why is this happening? This is most likely due to consistent no-shows,
          bad behavior, or other violations of the
          <Link href={RULEBOOK_URL} className="underline">
            <strong> LLL rules</strong>
          </Link>
          . As a result, you are unable to access the website and its features.
        </p>
        <p>
          If you think this is a mistake, please contact the admins via the
          WhatsApp group below:
        </p>

        <Link href={WHATS_APP_GROUP_URL} target="_blank" rel="noreferrer">
          <button className="text-xl flex items-center gap-x-2">
            <Image src={question} alt="question" />
            <b>Send a message to the LLL admins</b>
          </button>
        </Link>
      </div>
    </div>
  );
}
