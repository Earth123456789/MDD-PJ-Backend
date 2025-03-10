-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS service;

-- Connect to the database
\c order_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create status enum types
CREATE TYPE order_status_enum AS ENUM (
    'pending',
    'processing',
    'pickup_ready',
    'in_transit',
    'delivered',
    'cancelled',
    'returned'
);

CREATE TYPE item_status_enum AS ENUM (
    'pending',
    'packed',
    'shipped',
    'delivered',
    'returned'
);

-- Note: The actual tables will be created by Tortoise ORM
-- This SQL file just sets up prerequisites that might not be handled by the ORM