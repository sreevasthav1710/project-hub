-- Add missing columns to hackathons table
-- This migration adds the columns that the application expects

-- Add short_description column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathons' 
        AND column_name = 'short_description'
    ) THEN
        ALTER TABLE public.hackathons ADD COLUMN short_description TEXT;
    END IF;
END $$;

-- Add tech_stack column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathons' 
        AND column_name = 'tech_stack'
    ) THEN
        ALTER TABLE public.hackathons ADD COLUMN tech_stack TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Add start_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathons' 
        AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.hackathons ADD COLUMN start_date DATE;
    END IF;
END $$;

-- Add end_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathons' 
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE public.hackathons ADD COLUMN end_date DATE;
    END IF;
END $$;

-- Add status column if it doesn't exist (with enum type)
DO $$ 
BEGIN
    -- First create the enum type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hackathon_status') THEN
        CREATE TYPE public.hackathon_status AS ENUM ('upcoming', 'ongoing', 'completed');
    END IF;
    
    -- Then add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathons' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.hackathons ADD COLUMN status public.hackathon_status NOT NULL DEFAULT 'upcoming';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hackathons' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.hackathons ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
    END IF;
END $$;
