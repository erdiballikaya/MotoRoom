INSERT INTO vehicle_groups (category, brand, model, generation, slug, description, is_featured, member_count, last_activity_at)
VALUES
  ('automobile', 'Volvo', 'S40', NULL, 'automobile-volvo-s40', 'Volvo S40 owners, maintenance notes, common faults, and upgrade discussions.', TRUE, 0, NOW()),
  ('automobile', 'BMW', '3 Series', 'E90', 'automobile-bmw-3-series-e90', 'BMW E90 owners group for drivetrain, suspension, coding, and ownership experience.', TRUE, 0, NOW()),
  ('motorcycle', 'Yamaha', 'MT-07', NULL, 'motorcycle-yamaha-mt-07', 'Yamaha MT-07 riders discussing tires, exhaust, service, and routes.', TRUE, 0, NOW()),
  ('motorcycle', 'Honda', 'CB650R', NULL, 'motorcycle-honda-cb650r', 'Honda CB650R community for service, accessories, and rider experience.', FALSE, 0, NOW())
ON CONFLICT (slug) DO NOTHING;

