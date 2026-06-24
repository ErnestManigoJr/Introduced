-- Connector profiles: public matchmaker identity + sponsorship
CREATE TABLE IF NOT EXISTS connector_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  handle         text UNIQUE,                          -- @handle for connector channel
  tagline        text,                                  -- short description
  bio            text,
  avatar_url     text,
  banner_url     text,
  is_public      boolean NOT NULL DEFAULT true,
  -- sponsorship
  sponsor_name   text,
  sponsor_url    text,
  sponsor_logo_url text,
  sponsor_cta    text,                                 -- e.g. "Try it free"
  sponsor_active boolean NOT NULL DEFAULT false,
  -- stats (denormalized for display speed)
  total_intros   integer NOT NULL DEFAULT 0,
  successful_matches integer NOT NULL DEFAULT 0,       -- both_accepted count
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS connector_profiles_user_idx ON connector_profiles(user_id);

ALTER TABLE connector_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public connector profiles are viewable by all"
  ON connector_profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can manage their own connector profile"
  ON connector_profiles FOR ALL
  USING (auth.uid() = (SELECT auth_user_id FROM app_users WHERE id = user_id));

-- Update successful_matches when an introduction reaches both_accepted
CREATE OR REPLACE FUNCTION update_connector_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'both_accepted' AND OLD.status != 'both_accepted' THEN
    -- Increment successful_matches for the connector
    UPDATE connector_profiles
    SET
      successful_matches = successful_matches + 1,
      total_intros = total_intros + 1,
      updated_at = now()
    WHERE user_id = NEW.connector_id;
  ELSIF NEW.status = 'pending' AND TG_OP = 'INSERT' THEN
    -- On new intro, increment total_intros
    UPDATE connector_profiles
    SET total_intros = total_intros + 1, updated_at = now()
    WHERE user_id = NEW.connector_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_introduction_status_change
  AFTER INSERT OR UPDATE OF status ON introductions
  FOR EACH ROW EXECUTE FUNCTION update_connector_stats();
