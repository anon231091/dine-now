-- Database initialization script for PostgreSQL
-- This script runs when the database container starts for the first time

-- Create additional databases for testing
CREATE DATABASE restaurant_app_test;
CREATE DATABASE restaurant_app_dev;

-- Set timezone
SET timezone = 'Asia/Phnom_Penh';

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE restaurant_app TO postgres;
GRANT ALL PRIVILEGES ON DATABASE restaurant_app_test TO postgres;
GRANT ALL PRIVILEGES ON DATABASE restaurant_app_dev TO postgres;
