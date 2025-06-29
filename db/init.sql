-- Database initialization script for Philippine Market Price Tracker
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (PostgreSQL creates it automatically from environment)
-- CREATE DATABASE IF NOT EXISTS ph_price_tracker;

-- Grant privileges (handled by environment variables)
-- GRANT ALL PRIVILEGES ON DATABASE ph_price_tracker TO postgres;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Tables will be created by Prisma migrations
-- This file is mainly for any custom initialization needed 