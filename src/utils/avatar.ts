import { supabase } from "@/lib/supabase";
import type { IUser } from "@/types/users";

export const getAvatarUrl = async (userId: string) => {
  const filePath = `avatars/${userId}`;
  const { data } = await supabase.storage
    .from("avatars")
    .download(`${filePath}?downloaded_at=${Date.now()}`);

  return data;
};

export const uploadAvatar = async (compressedFile: File, user: IUser) => {
  const filePath = `avatars/${user._id.toString()}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, compressedFile, { upsert: true });

  if (error !== null) throw error;

  return await getAvatarUrl(user._id.toString());
};
