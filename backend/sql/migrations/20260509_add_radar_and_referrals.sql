-- Radar feature schema extension
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS is_radar_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS radar_category VARCHAR(20);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS radar_reason TEXT;

CREATE TABLE IF NOT EXISTS share_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID REFERENCES users(id),
    invitee_phone VARCHAR(11),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
