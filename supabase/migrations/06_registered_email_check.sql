-- ==============================================================================
-- OLIVEAL GAMING ZONE — REGISTERED EMAIL CHECK FOR PASSWORD RESET
-- Ensures password recovery emails are ONLY dispatched when the submitted email
-- exists in the database (either Admin or Customer account), while preserving
-- strict RLS privacy on public.profiles and auth.users.
-- ==============================================================================
-- Compatible with 01_auth_schema.sql through 05_app_settings_and_profiles.sql.
-- Safe & idempotent: read-only helper returning STRICTLY a boolean.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_registered_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT CASE
    WHEN p_email IS NULL OR length(trim(p_email)) = 0 THEN false
    ELSE (
      EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE lower(trim(u.email)) = lower(trim(p_email))
          AND u.deleted_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE lower(trim(p.email)) = lower(trim(p_email))
      )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.is_registered_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_registered_email(TEXT) TO anon, authenticated;

