CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE membership_tier AS ENUM ('standard', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dm_policy AS ENUM ('premium_only', 'open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_category AS ENUM ('automobile', 'motorcycle');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('active', 'left', 'archived', 'banned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dm_permission_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE private_group_invite_policy AS ENUM ('owner_approval', 'invite_only');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  membership_tier membership_tier NOT NULL DEFAULT 'standard',
  role user_role NOT NULL DEFAULT 'user',
  dm_policy dm_policy NOT NULL DEFAULT 'premium_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_membership_tier ON users(membership_tier);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE TABLE IF NOT EXISTS vehicle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category vehicle_category NOT NULL,
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(120) NOT NULL,
  generation VARCHAR(80),
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  member_count INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_groups_unique_public_vehicle
ON vehicle_groups (
  category,
  LOWER(brand),
  LOWER(model),
  LOWER(COALESCE(generation, ''))
)
WHERE is_private = FALSE;

CREATE INDEX IF NOT EXISTS idx_vehicle_groups_category_brand_model ON vehicle_groups(category, brand, model);
CREATE INDEX IF NOT EXISTS idx_vehicle_groups_featured_activity ON vehicle_groups(is_featured, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_groups_search ON vehicle_groups USING GIN ((brand || ' ' || model || ' ' || COALESCE(generation, '')) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES vehicle_groups(id) ON DELETE CASCADE,
  status membership_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  rejoin_not_before TIMESTAMPTZ,
  last_read_message_id TEXT,
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  UNIQUE (user_id, group_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_memberships_active_unique
ON group_memberships(user_id, group_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_group_memberships_user_status ON group_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_status ON group_memberships(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_memberships_cooldown ON group_memberships(user_id, rejoin_not_before);

CREATE TABLE IF NOT EXISTS dm_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pair_low UUID GENERATED ALWAYS AS (LEAST(requester_user_id, recipient_user_id)) STORED,
  pair_high UUID GENERATED ALWAYS AS (GREATEST(requester_user_id, recipient_user_id)) STORED,
  status dm_permission_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT dm_permissions_not_self CHECK (requester_user_id <> recipient_user_id),
  CONSTRAINT dm_permissions_pair_unique UNIQUE (pair_low, pair_high)
);

CREATE INDEX IF NOT EXISTS idx_dm_permissions_recipient_status ON dm_permissions(recipient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_dm_permissions_requester_status ON dm_permissions(requester_user_id, status);

CREATE TABLE IF NOT EXISTS private_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL UNIQUE REFERENCES vehicle_groups(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_policy private_group_invite_policy NOT NULL DEFAULT 'owner_approval',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_groups_owner ON private_groups(owner_user_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL,
  provider_subscription_id TEXT NOT NULL UNIQUE,
  status subscription_status NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_ip INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked ON refresh_tokens(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

