import { supabase } from "./supabaseClient";

export async function uploadToBucket(bucket: string, path: string, file: File | Blob) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file as any, { upsert: true });
  if (error) throw error;
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicData.publicUrl as string;
}

export async function deleteFromBucket(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
  return true;
}
