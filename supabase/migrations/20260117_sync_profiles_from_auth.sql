-- Sync auth.users into public.profiles (one-time sync)
-- Run this in Supabase SQL editor (it runs with the DB role so it can read auth.users).

INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT u.id, u.email, COALESCE(u.user_metadata->>'full_name', u.email) AS full_name, now(), now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Optional: create a trigger to insert into profiles automatically when a new auth user is created.
-- Warning: Creating triggers on the auth schema may require elevated permissions; test carefully.

CREATE OR REPLACE FUNCTION public.insert_profile_from_auth() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.user_metadata->>'full_name', NEW.email), now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users (run only if allowed in your Supabase project)
-- CREATE TRIGGER on_auth_user_created
-- AFTER INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION public.insert_profile_from_auth();

-- If you cannot create triggers on auth.users, consider calling the INSERT sync periodically or from a server-side webhook.
