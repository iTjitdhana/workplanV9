-- Fix MySQL User Permissions for jitdhana user
-- NOTE: Avoid hardcoding specific IPs in grants unless required by policy.
--       Prefer using '%' or set the host explicitly before running this script.
--       If you must restrict to a specific host, replace 192.168.0.94 below
--       with your actual database-access host.
-- Run this script as MySQL root user

-- Create user if not exists and set password
CREATE USER IF NOT EXISTS 'jitdhana'@'%' IDENTIFIED BY 'iT123454$';
CREATE USER IF NOT EXISTS 'jitdhana'@'localhost' IDENTIFIED BY 'iT123454$';
CREATE USER IF NOT EXISTS 'jitdhana'@'192.168.0.94' IDENTIFIED BY 'iT123454$';

-- Grant all privileges on esp_tracker database
GRANT ALL PRIVILEGES ON esp_tracker.* TO 'jitdhana'@'%';
GRANT ALL PRIVILEGES ON esp_tracker.* TO 'jitdhana'@'localhost';
GRANT ALL PRIVILEGES ON esp_tracker.* TO 'jitdhana'@'192.168.0.94';

-- Grant some additional privileges if needed
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON esp_tracker.* TO 'jitdhana'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON esp_tracker.* TO 'jitdhana'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON esp_tracker.* TO 'jitdhana'@'192.168.0.94';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show user privileges (for verification)
SHOW GRANTS FOR 'jitdhana'@'%';
SHOW GRANTS FOR 'jitdhana'@'localhost';
SHOW GRANTS FOR 'jitdhana'@'192.168.0.94';

-- Check if user exists
SELECT User, Host FROM mysql.user WHERE User = 'jitdhana'; 