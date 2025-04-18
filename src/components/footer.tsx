import { WHATS_APP_GROUP_URL } from "@/constants/links";

export function Footer() {
  return (
    <footer className="container flex justify-center items-center h-16 bg-gray-800 text-white w-full max-w-none mt-auto">
      <div className="mx-auto p-4 !w-full">
        <div className="flex justify-between items-center justify-self-end w-full">
          <span className="text-xs mr-auto">
            made with love for LLL by daveo
          </span>
          <a
            href={WHATS_APP_GROUP_URL}
            className="underline text-blue-500"
            target="_blank"
            rel="noopener noreferrer"
          >
            LLL WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
