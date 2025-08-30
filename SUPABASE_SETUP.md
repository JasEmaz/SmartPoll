# Supabase Setup for Smart Poll Application

This guide will help you set up the required Supabase database schema for the Smart Poll application.

## Prerequisites

1. A Supabase account (sign up at [https://supabase.com](https://supabase.com) if you don't have one)
2. A Supabase project created for this application

## Setup Instructions

### 1. Access SQL Editor

1. Log in to your Supabase dashboard
2. Select your project
3. Navigate to the SQL Editor in the left sidebar

### 2. Create Database Schema

1. Create a new query in the SQL Editor
2. Copy and paste the entire contents of the `supabase_schema.sql` file into the editor
3. Run the query to create all necessary tables, functions, and policies

### 3. Verify Setup

1. Navigate to the "Table Editor" in the left sidebar
2. You should see the following tables:
   - `polls`
   - `poll_options`
   - `votes`

### 4. Update Environment Variables

Make sure your `.env.local` file contains the correct Supabase URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema Overview

### Tables

1. **polls**
   - `id`: UUID (primary key)
   - `question`: TEXT
   - `user_id`: UUID (references auth.users)
   - `created_at`: TIMESTAMP
   - `updated_at`: TIMESTAMP

2. **poll_options**
   - `id`: UUID (primary key)
   - `poll_id`: UUID (references polls)
   - `option_text`: TEXT
   - `votes`: INTEGER
   - `created_at`: TIMESTAMP
   - `updated_at`: TIMESTAMP

3. **votes**
   - `id`: UUID (primary key)
   - `user_id`: UUID (references auth.users)
   - `poll_id`: UUID (references polls)
   - `option_id`: UUID (references poll_options)
   - `created_at`: TIMESTAMP

### Functions

- **increment_vote**: Increments the vote count for a poll option and records the user's vote

### Row Level Security (RLS)

The schema includes Row Level Security policies to ensure:

- Anyone can view polls and options
- Only authenticated users can create polls
- Users can only update/delete their own polls
- Users can only vote once per poll

## Reverting to Real Database Implementation

Once you've set up the Supabase database schema, you can revert the mock implementations in the application code:

1. Update `app/dashboard/page.tsx` to use the real Supabase fetch implementation
2. Update `app/polls/create/page.tsx` to use the real Supabase insert implementation
3. Update `app/polls/[id]/page.tsx` to use the real Supabase fetch implementation

## Troubleshooting

If you encounter any issues:

1. Check the Supabase logs in your project dashboard
2. Verify that your environment variables are correctly set
3. Ensure that the SQL script executed without errors
4. Check that Row Level Security is properly enabled