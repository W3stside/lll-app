import { useState, useCallback } from "react";

import { ImagePixelated } from "../PixelatedImage";

import { RED_TW } from "@/constants/colours";

const ONE_MB = 1_048_576;
const ERRORS_MAP = {
  fileTooLarge: "File size is too large. Must be less than 1mb",
};

interface IProfileError {
  errors:
    | {
        [key in keyof typeof ERRORS_MAP]: string;
      }
    | null;
  errorKey: keyof typeof ERRORS_MAP;
  className?: string;
}

function UploadError({ errors, errorKey, className }: IProfileError) {
  return (
    errors !== null && (
      <span className={`px-2 py-1 text-xs ${RED_TW} ${className}`}>
        {errors[errorKey]}
      </span>
    )
  );
}

export function Uploader() {
  const [uploadKey, setUploadKey] = useState(Date.now());
  const [file, setFile] = useState<File | undefined>();

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((e) => {
      setFile(e.target.files?.[0]);
    }, []);

  const disabled = file !== undefined && file.size > ONE_MB;

  return (
    <div className="flex flex-col">
      <div className="flex gap-x-4 items-start h-auto py-4">
        {file !== undefined && file.size <= ONE_MB && (
          <ImagePixelated
            src={URL.createObjectURL(file)}
            pixelSize={3}
            height={80}
            width={80}
          />
        )}
        <label
          htmlFor="imageUpload"
          className="flex flex-row gap-y-2 flex-1 bg-white h-full px-2 py-1 cursor-pointer border-2 border-r-[var(--border-light)] border-b-[var(--border-light)]"
        >
          <div className="flex items-center gap-x-2">
            {file === undefined ? (
              "Upload a new profile photo"
            ) : (
              <strong>{file.name}</strong>
            )}
          </div>
          <input
            key={uploadKey}
            type="file"
            className="hidden"
            id="imageUpload"
            name="image"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
        {file !== undefined && (
          <div className="flex gap-x-4 items-center">
            <button
              className="ml-auto bg-[var(--background-color-2)]"
              onClick={() => {
                setUploadKey(Date.now());
                setFile(undefined);
              }}
            >
              Remove
            </button>
            <button
              className="ml-auto"
              disabled={disabled}
              onClick={() => {
                setUploadKey(Date.now());
                setFile(undefined);
              }}
            >
              Upload
            </button>
          </div>
        )}
      </div>
      {file !== undefined && file.size > ONE_MB && (
        <UploadError
          errors={ERRORS_MAP}
          errorKey="fileTooLarge"
          className="mt-2"
        />
      )}
    </div>
  );
}
