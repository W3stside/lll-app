import { supabase } from "@/lib/supabase";
import type { IUser } from "@/types/users";

export const getAvatarUrl = (userId: string, ext = "jpeg") => {
  const filePath = `avatars/${userId}.${ext}`;
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
};

export const uploadAvatar = async (compressedFile: File, user: IUser) => {
  const fileExt = compressedFile.name.split(".").pop();
  const filePath = `avatars/${user._id.toString()}.${fileExt}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, compressedFile, { upsert: true });

  if (error !== null) throw error;

  return getAvatarUrl(user._id.toString(), fileExt);
};
