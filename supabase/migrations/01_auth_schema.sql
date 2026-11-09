-- ==============================================================================
-- OLIVEAL GAMING ZONE — DATABASE SCHEMA (FEATURE 1: AUTHENTICATION)
-- ==============================================================================

-- 1. Create public.profiles table referencing auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Security Helper Function: Check if the requesting user is an admin
-- SECURITY DEFINER ensures the check runs with privileges to avoid circular RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. RLS Policies for profiles

-- Customers can view their own profile; Admins can view all profiles
CREATE POLICY "Users can view their own profile, Admins can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR public.is_admin()
);

-- Users can update their own profile (cannot change role directly via client update)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- 5. Trigger: Automatically provision public.profiles upon auth.users creation
-- Trigger handles both Email/Password signups and Google OAuth signins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Gamer'),
    NEW.email,
    'customer', -- STRICT BUSINESS RULE: All public signups are assigned customer role
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists to allow idempotent re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. ADMIN PROVISIONING INSTRUCTIONS (SERVER-SIDE ONLY)
-- ==============================================================================
-- Since admin registration is strictly prohibited from the frontend,
-- run the following command in the Supabase SQL Editor to elevate an admin:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'admin@olivealgaming.com';
-- ==============================================================================

