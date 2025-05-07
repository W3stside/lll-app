import imageCompression from "browser-image-compression";
import { useState, useCallback, type ReactNode } from "react";

import { Loader } from "../ui";
import { PlaceholderAvatar } from "./PlaceholderAvatar";
import { Avatar } from "../Avatar";
import { MAX_IMAGE_WIDTH } from "../Avatar/constants";

import { RED_TW } from "@/constants/colours";
import { SUPABASE_BASE_AVATAR_URI } from "@/constants/links";
import { useActions } from "@/context/Actions/context";
import { useUser } from "@/context/User/context";
import type { IUserSafe } from "@/types/users";
import { uploadAvatar } from "@/utils/avatar";

const ONE_MB = 1_048_576;
const COMPRESS_TO_MB = 0.01;
const COMPRESS_OPTIONS = {
  maxSizeMB: COMPRESS_TO_MB,
  maxWidthOrHeight: MAX_IMAGE_WIDTH,
  useWebWorker: true,
};
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif"];

const ERRORS_MAP = {
  fileTooLarge: "File size is too large. Must be less than 1mb",
  wrongFileType:
    "File type is not supported. Only JPG/JPEG and PNG are allowed",
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

interface IUploader {
  user: IUserSafe;
  title?: ReactNode;
}

export function Uploader({ title }: IUploader) {
  const [loading, setLoading] = useState(false);

  const [uploadKey, setUploadKey] = useState(Date.now());
  const [file, setFile] = useState<File | undefined>();

  const { user, setUser } = useUser();
  const { updateUser } = useActions();

  const resetFile = useCallback(() => {
    setFile(undefined);
    setUploadKey(Date.now());
  }, []);

  const handleFileChange = useCallback(async () => {
    if (file === undefined) return;

    try {
      setLoading(true);
      const compressedFile = await imageCompression(file, COMPRESS_OPTIONS);

      await uploadAvatar(compressedFile, user);
      await updateUser(user);

      setFile(compressedFile);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setLoading(false);
      resetFile();
    }
  }, [file, resetFile, updateUser, user]);

  const disabled =
    file === undefined ||
    file.size > ONE_MB ||
    !ALLOWED_FILE_TYPES.includes(file.type);

  return (
    <div className="flex flex-col">
      <div className="flex gap-x-4 items-center h-auto">
        {file !== undefined ? (
          <Avatar src={URL.createObjectURL(file)} width={80} height={80} />
        ) : loading ? (
          <div className="overflow-hidden w-[80px] h-[80px] relative self-center">
            <Loader className="absolute -top-[23px] -left-[28px] w-[130px] height-[100px] max-w-none" />
          </div>
        ) : (
          <PlaceholderAvatar className="bg-[var(--background-color-2)]" />
        )}
        <div className="flex flex-col flex-1">
          {title}
          <div className="flex gap-x-4 items-start h-auto py-2">
            <label
              htmlFor="imageUpload"
              className="flex flex-row gap-y-2 flex-1 text-[var(--text-color-primary)] bg-[var(--background-color-2)] h-[40px] max-w-[70%] px-2 py-1 cursor-pointer border-2 border-r-[var(--border-light)] border-b-[var(--border-light)]"
            >
              <div className="flex items-center gap-x-2 text-md">
                {file === undefined ? (
                  "Select a photo"
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
                onChange={(e) => {
                  setFile(e.target.files?.[0]);

                  if (user._id !== undefined) {
                    const optimisticUrl = `${SUPABASE_BASE_AVATAR_URI}avatars/avatars/${user._id.toString()}`;
                    setUser((_user) => ({
                      ..._user,
                      avatarUrl: optimisticUrl,
                    }));
                  }
                }}
              />
            </label>
            {file !== undefined && (
              <div className="flex gap-x-4 items-center">
                <button
                  className="ml-auto bg-[var(--background-color-2)]"
                  onClick={resetFile}
                >
                  Remove
                </button>
                <button
                  className="ml-auto"
                  disabled={disabled}
                  onClick={async () => {
                    await handleFileChange();
                  }}
                >
                  Upload
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {disabled && file !== undefined && (
        <UploadError
          errors={ERRORS_MAP}
          errorKey={file.size > ONE_MB ? "fileTooLarge" : "wrongFileType"}
          className="mt-2"
        />
      )}
    </div>
  );
}
