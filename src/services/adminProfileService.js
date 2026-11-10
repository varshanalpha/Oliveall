/**
 * OLIVEAL GAMING ZONE — ADMIN PROFILE MANAGEMENT SERVICE
 * Reads & updates the authenticated admin's real public.profiles record and avatar
 * stored in Supabase Storage (`avatars` bucket). Email & role remain immutable.
 */

import { supabase } from '../lib/supabase';
import { verifyAdminSession } from './adminDashboardService';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateAvatarFile(file) {
  if (!file) return;
  if (!ALLOWED_IMAGE_MIME_TYPES.has(String(file.type || '').toLowerCase())) {
    throw new Error('Please upload a valid image file (PNG, JPG, WEBP, or GIF).');
  }
  if (Number(file.size || 0) > MAX_AVATAR_BYTES) {
    throw new Error('Profile picture must be 5 MB or smaller.');
  }
}

/**
 * Fetches the currently authenticated admin profile directly from `public.profiles`.
 */
export async function fetchAuthenticatedAdminProfile() {
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    const err = new Error(
      authCheck.reason === 'unauthenticated'
        ? 'Your session has expired. Please sign in again.'
        : 'Administrative privileges required to access admin profile.'
    );
    err.code = authCheck.reason;
    throw err;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, created_at, updated_at')
    .eq('id', authCheck.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to load admin profile from Supabase.');
  }
  if (!data) {
    throw new Error('Authenticated admin profile record not found.');
  }

  return data;
}

/**
 * Uploads an avatar file for the authenticated admin into Supabase Storage `avatars` bucket
 * and returns its public URL.
 */
async function uploadAdminAvatarFile(userId, file) {
  validateAvatarFile(file);

  const rawExt = String(file.name || '').split('.').pop()?.toLowerCase();
  const ext =
    rawExt && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(rawExt)
      ? rawExt
      : file.type === 'image/png'
      ? 'png'
      : 'jpg';

  const objectPath = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(objectPath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  if (uploadError) {
    const msg = String(uploadError.message || '');
    if (msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('not found')) {
      throw new Error(
        'Storage bucket "avatars" is not configured yet. Please execute supabase/migrations/05_app_settings_and_profiles.sql in Supabase SQL Editor.'
      );
    }
    throw new Error(msg || 'Failed to upload profile picture to Supabase Storage.');
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(objectPath);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) {
    throw new Error('Uploaded image URL could not be resolved from Supabase Storage.');
  }
  return publicUrl;
}

/**
 * Updates only `full_name` and optional `avatar_url` for the authenticated admin in `public.profiles`.
 * Never modifies `email` or `role`.
 */
export async function updateAuthenticatedAdminProfile({ fullName, avatarFile = null }) {
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    const err = new Error(
      authCheck.reason === 'unauthenticated'
        ? 'Your session has expired. Please sign in again.'
        : 'Administrative privileges required to update admin profile.'
    );
    err.code = authCheck.reason;
    throw err;
  }

  const trimmedName = String(fullName ?? '').trim();
  if (!trimmedName) {
    throw new Error('Full Name is required.');
  }
  if (trimmedName.length < 2 || trimmedName.length > 80) {
    throw new Error('Full Name must be between 2 and 80 characters.');
  }

  let uploadedAvatarUrl = null;
  if (avatarFile) {
    uploadedAvatarUrl = await uploadAdminAvatarFile(authCheck.user.id, avatarFile);
  }

  const updates = {
    full_name: trimmedName,
    updated_at: new Date().toISOString(),
  };
  if (uploadedAvatarUrl) {
    updates.avatar_url = uploadedAvatarUrl;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', authCheck.user.id)
    .select('id, full_name, email, role, avatar_url, created_at, updated_at')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to update admin profile in Supabase.');
  }
  if (!data) {
    throw new Error('Profile update was rejected or profile record was not found.');
  }

  // Sync auth metadata best-effort so Auth user metadata matches updated full_name/avatar
  try {
    await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
        ...(uploadedAvatarUrl ? { avatar_url: uploadedAvatarUrl } : {}),
      },
    });
  } catch {
    // Non-blocking sync
  }

  return data;
}

