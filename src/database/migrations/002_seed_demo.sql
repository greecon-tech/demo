INSERT INTO tenants (id, name, domain, status)
VALUES ('11111111-1111-4111-8111-111111111111', 'Greecon Demo', 'demo.greecon.earth', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, email, name, status)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'eridon.manuka@greecon.earth', 'Eridon Manuka', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'operator@greecon.earth', 'Demo Operator', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', 'auditor@greecon.earth', 'Demo Auditor', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO memberships (id, tenant_id, user_id, role)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'owner'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'operator'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'auditor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sites (id, tenant_id, name, type, location_name, latitude, longitude, status, edge_status)
VALUES
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111111', 'Integrated Farm Site', 'integrated_site', 'Durana Tech Park, Albania', 41.3687860, 19.6156730, 'OK', 'OK'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111111', 'Water Management Site', 'water_facility', 'Albania', 41.3275460, 19.8186980, 'Watch', 'OK'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111111', 'Solar + Battery Site', 'energy_site', 'Albania', 41.1203000, 20.0839000, 'OK', 'Simulated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO assets (id, tenant_id, site_id, name, type, status, metadata)
VALUES
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', 'Solar Array A', 'SolarSystem', 'OK', '{"capacity_kw": 42}'),
  ('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222203', 'Battery Bank A', 'BatterySystem', 'OK', '{"capacity_kwh": 96}'),
  ('33333333-3333-4333-8333-333333333303', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', 'Primary Water Tank', 'WaterSystem', 'Watch', '{"volume_m3": 120}'),
  ('33333333-3333-4333-8333-333333333304', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', 'Pump Station North', 'PumpStation', 'OK', '{"pump_count": 2}'),
  ('33333333-3333-4333-8333-333333333305', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', 'Irrigation Zone 1', 'IrrigationZone', 'OK', '{"crop": "demo"}'),
  ('33333333-3333-4333-8333-333333333306', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', 'Greenhouse Block A', 'Greenhouse', 'OK', '{"area_m2": 600}'),
  ('33333333-3333-4333-8333-333333333307', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', 'Weather Station', 'WeatherStation', 'OK', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO edge_gateways (id, tenant_id, site_id, name, status, last_seen_utc, software_version, secure_identity_status)
VALUES
  ('77777777-7777-4777-8777-777777777701', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', 'Integrated Farm Gateway', 'OK', now(), 'edge-sim-0.1.0', 'placeholder'),
  ('77777777-7777-4777-8777-777777777702', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', 'Water Facility Gateway', 'OK', now(), 'edge-sim-0.1.0', 'placeholder'),
  ('77777777-7777-4777-8777-777777777703', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222203', 'Energy Site Gateway', 'Simulated', now(), 'edge-sim-0.1.0', 'placeholder')
ON CONFLICT (id) DO NOTHING;

INSERT INTO devices (id, tenant_id, site_id, asset_id, gateway_id, name, device_type, protocol, driver_type, health, last_seen_utc, firmware_version, secure_identity_status)
VALUES
  ('44444444-4444-4444-8444-444444444401', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', '77777777-7777-4777-8777-777777777701', 'Solar Inverter A', 'inverter', 'simulated', 'simulated-solar-driver', 'OK', now(), 'sim-1.0.0', 'placeholder'),
  ('44444444-4444-4444-8444-444444444402', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222203', '33333333-3333-4333-8333-333333333302', '77777777-7777-4777-8777-777777777703', 'Battery Controller A', 'battery_controller', 'simulated', 'simulated-battery-driver', 'OK', now(), 'sim-1.0.0', 'placeholder'),
  ('44444444-4444-4444-8444-444444444403', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303', '77777777-7777-4777-8777-777777777702', 'Tank Level Sensor', 'level_sensor', 'simulated', 'simulated-water-driver', 'OK', now(), 'sim-1.0.0', 'placeholder'),
  ('44444444-4444-4444-8444-444444444404', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333304', '77777777-7777-4777-8777-777777777702', 'Pump Station PLC', 'plc', 'simulated', 'simulated-pump-driver', 'OK', now(), 'sim-1.0.0', 'placeholder'),
  ('44444444-4444-4444-8444-444444444405', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333305', '77777777-7777-4777-8777-777777777701', 'Irrigation Controller', 'irrigation_controller', 'simulated', 'simulated-irrigation-driver', 'OK', now(), 'sim-1.0.0', 'placeholder'),
  ('44444444-4444-4444-8444-444444444406', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333307', '77777777-7777-4777-8777-777777777701', 'Weather Station Node', 'weather_station', 'simulated', 'simulated-climate-driver', 'OK', now(), 'sim-1.0.0', 'placeholder')
ON CONFLICT (id) DO NOTHING;

INSERT INTO points (id, tenant_id, site_id, asset_id, device_id, canonical_name, label, unit, quality, capability, threshold_config)
VALUES
  ('55555555-5555-4555-8555-555555555501', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', '44444444-4444-4444-8444-444444444401', 'energy.solar.power.kw', 'Solar production', 'kW', 'OK', 'read', '{"watch_low": 2}'),
  ('55555555-5555-4555-8555-555555555502', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222203', '33333333-3333-4333-8333-333333333302', '44444444-4444-4444-8444-444444444402', 'energy.battery.soc.percent', 'Battery state of charge', '%', 'OK', 'read', '{"warning_low": 25}'),
  ('55555555-5555-4555-8555-555555555503', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303', '44444444-4444-4444-8444-444444444403', 'water.tank.level.percent', 'Tank level', '%', 'OK', 'read', '{"critical_low": 15, "warning_low": 35}'),
  ('55555555-5555-4555-8555-555555555504', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333304', '44444444-4444-4444-8444-444444444404', 'water.flow.lpm', 'Pump flow', 'lpm', 'OK', 'read', '{"dry_run_lpm": 0.2}'),
  ('55555555-5555-4555-8555-555555555505', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333304', '44444444-4444-4444-8444-444444444404', 'water.pressure.bar', 'Line pressure', 'bar', 'OK', 'read', '{"max_bar": 5.5}'),
  ('55555555-5555-4555-8555-555555555506', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333305', '44444444-4444-4444-8444-444444444405', 'agri.soil.moisture.percent', 'Soil moisture', '%', 'OK', 'read', '{"irrigate_below": 28}'),
  ('55555555-5555-4555-8555-555555555507', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333307', '44444444-4444-4444-8444-444444444406', 'agri.air.temperature.c', 'Air temperature', 'C', 'OK', 'read', '{}'),
  ('55555555-5555-4555-8555-555555555508', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333307', '44444444-4444-4444-8444-444444444406', 'agri.humidity.percent', 'Humidity', '%', 'OK', 'read', '{}'),
  ('55555555-5555-4555-8555-555555555509', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333304', '44444444-4444-4444-8444-444444444404', 'water.pump.command', 'Pump command', 'state', 'OK', 'write', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO telemetry_readings (timestamp_utc, tenant_id, site_id, asset_id, device_id, point_id, canonical_name, value_numeric, unit, quality, source)
VALUES
  (now() - interval '10 minutes', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', '44444444-4444-4444-8444-444444444401', '55555555-5555-4555-8555-555555555501', 'energy.solar.power.kw', 18.6, 'kW', 'OK', 'simulator'),
  (now() - interval '9 minutes', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222203', '33333333-3333-4333-8333-333333333302', '44444444-4444-4444-8444-444444444402', '55555555-5555-4555-8555-555555555502', 'energy.battery.soc.percent', 68.0, '%', 'OK', 'simulator'),
  (now() - interval '8 minutes', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303', '44444444-4444-4444-8444-444444444403', '55555555-5555-4555-8555-555555555503', 'water.tank.level.percent', 38.0, '%', 'WARN', 'simulator'),
  (now() - interval '7 minutes', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333304', '44444444-4444-4444-8444-444444444404', '55555555-5555-4555-8555-555555555504', 'water.flow.lpm', 11.7, 'lpm', 'OK', 'simulator'),
  (now() - interval '6 minutes', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333304', '44444444-4444-4444-8444-444444444404', '55555555-5555-4555-8555-555555555505', 'water.pressure.bar', 2.8, 'bar', 'OK', 'simulator'),
  (now() - interval '5 minutes', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333305', '44444444-4444-4444-8444-444444444405', '55555555-5555-4555-8555-555555555506', 'agri.soil.moisture.percent', 24.0, '%', 'OK', 'simulator'),
  (now() - interval '4 minutes', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333307', '44444444-4444-4444-8444-444444444406', '55555555-5555-4555-8555-555555555507', 'agri.air.temperature.c', 24.5, 'C', 'OK', 'simulator'),
  (now() - interval '3 minutes', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333307', '44444444-4444-4444-8444-444444444406', '55555555-5555-4555-8555-555555555508', 'agri.humidity.percent', 62.0, '%', 'OK', 'simulator');

INSERT INTO derived_states (id, tenant_id, site_id, asset_id, state_key, state_value, severity, confidence, reason)
VALUES
  ('66666666-6666-4666-8666-666666666601', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303', 'water.tank.low', 'true', 'warning', 0.900, 'Tank level is below the refill planning threshold.'),
  ('66666666-6666-4666-8666-666666666602', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', 'energy.surplus_available', 'true', 'watch', 0.850, 'Solar production is above current load estimate.'),
  ('66666666-6666-4666-8666-666666666603', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333305', 'agri.irrigation_required', 'true', 'watch', 0.850, 'Soil moisture is below the irrigation threshold.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rules (id, tenant_id, site_id, name, priority, trigger_type, conditions, constraints, actions, execution_mode, explanation_template, rollback_behavior, enabled, approval_state, version, created_by, updated_by)
VALUES
  ('88888888-8888-4888-8888-888888888801', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', 'Dry-run protection', 'safety', 'failsafe', '[{"point":"water.flow.lpm","operator":"lte","value":0.2}]', '[]', '[{"type":"command","targetCanonicalName":"water.pump.command","value":"OFF","message":"Stop pump because flow is below dry-run threshold."}]', 'edge', 'Pump protection is applied locally at the edge.', 'Keep pump stopped until flow and sensor quality are valid.', true, 'approved', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  ('88888888-8888-4888-8888-888888888802', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', 'Overpressure cutoff', 'safety', 'threshold', '[{"point":"water.pressure.bar","operator":"gte","value":5.5}]', '[]', '[{"type":"command","targetCanonicalName":"water.pump.command","value":"OFF","message":"Stop pump because pressure exceeds safety limit."}]', 'edge', 'Overpressure cutoff is enforced locally and cannot be bypassed remotely.', 'Stop pump and require inspection before restart.', true, 'approved', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  ('88888888-8888-4888-8888-888888888803', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', 'Irrigate when soil moisture is low', 'optimization', 'threshold', '[{"stateKey":"agri.irrigation_required","operator":"eq","value":true}]', '[{"stateKey":"system.sensor_quality_bad","operator":"neq","value":true}]', '[{"type":"command","targetCanonicalName":"agri.irrigation.command","value":"ON","message":"Start irrigation when soil moisture remains below threshold."}]', 'simulation', 'Irrigation starts only when sensor quality and safety constraints are satisfied.', 'Stop irrigation and return to previous schedule.', true, 'approved', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  ('88888888-8888-4888-8888-888888888804', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', 'Refill tank when solar surplus exists', 'efficiency', 'multi_variable', '[{"stateKey":"water.tank.low","operator":"eq","value":true},{"stateKey":"energy.surplus_available","operator":"eq","value":true}]', '[{"stateKey":"system.sensor_quality_bad","operator":"neq","value":true}]', '[{"type":"command","targetCanonicalName":"water.pump.command","value":"ON","message":"Refill water tank during solar surplus window."}]', 'simulation', 'Tank refill is aligned with available renewable energy.', 'Stop pump and return to minimum safe state.', true, 'approved', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  ('88888888-8888-4888-8888-888888888805', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', 'Advisory: reduce irrigation if rain forecast placeholder is true', 'advisory', 'forecast', '[{"stateKey":"agri.irrigation_required","operator":"eq","value":true}]', '[]', '[{"type":"recommendation","message":"Check rain forecast placeholder before irrigation."}]', 'advisory', 'Forecast integration is planned; the MVP only records the recommendation.', 'No actuation is dispatched.', true, 'approved', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO alerts (id, tenant_id, site_id, asset_id, category, severity, status, title, suggested_action)
VALUES
  ('99999999-9999-4999-8999-999999999901', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303', 'resource_threshold', 'warning', 'open', 'Water tank approaching low threshold', 'Review refill timing and solar surplus availability.'),
  ('99999999-9999-4999-8999-999999999902', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333305', 'resource_threshold', 'watch', 'open', 'Soil moisture below irrigation threshold', 'Simulate irrigation rule and confirm safety conditions.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO incidents (id, tenant_id, site_id, alert_id, status, severity, title, investigation_notes)
VALUES
  ('abababab-abab-4aba-8aba-ababababab01', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '99999999-9999-4999-8999-999999999901', 'acknowledged', 'warning', 'Water storage planning review', 'Demo incident linked to low tank alert.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO maintenance_tasks (id, tenant_id, site_id, asset_id, incident_id, title, notes, due_at, status)
VALUES
  ('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcd01', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333304', 'abababab-abab-4aba-8aba-ababababab01', 'Inspect pump station pressure sensor', 'Confirm pressure sensor calibration before enabling cloud-assisted pump rules.', now() + interval '7 days', 'open')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_events (id, tenant_id, user_id, event_type, site_id, asset_id, entity_type, entity_id, after_metadata, reason)
VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'rule.approved', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333304', 'rule', '88888888-8888-4888-8888-888888888801', '{"rule":"Dry-run protection"}', 'Initial MVP safety baseline.'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'rule.approved', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333304', 'rule', '88888888-8888-4888-8888-888888888802', '{"rule":"Overpressure cutoff"}', 'Initial MVP safety baseline.'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'alert.acknowledged', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303', 'alert', '99999999-9999-4999-8999-999999999901', '{"status":"acknowledged"}', 'Operator acknowledged demo low tank alert.')
ON CONFLICT (id) DO NOTHING;
