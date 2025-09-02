-- Supabase Schema for Smart Poll Application

-- Users table is handled by Supabase Auth

-- Polls table to store poll questions
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Poll options table to store the choices for each poll
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table to track who voted for which option
-- This prevents users from voting multiple times on the same poll
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, poll_id) -- Ensures a user can only vote once per poll
);

-- Function to increment votes for a poll option
CREATE OR REPLACE FUNCTION increment_vote(option_id UUID, poll_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert the vote record
  INSERT INTO votes (user_id, poll_id, option_id)
  VALUES (user_id, poll_id, option_id);
  
  -- Increment the votes count for the option
  UPDATE poll_options
  SET votes = votes + 1
  WHERE id = option_id;
  
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'User has already voted on this poll';
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Polls policies
-- Anyone can view polls
CREATE POLICY "Polls are viewable by everyone" 
  ON polls FOR SELECT 
  USING (true);

-- Only authenticated users can create polls
CREATE POLICY "Users can create polls" 
  ON polls FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own polls
CREATE POLICY "Users can update their own polls" 
  ON polls FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Users can only delete their own polls
CREATE POLICY "Users can delete their own polls" 
  ON polls FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Poll options policies
-- Anyone can view poll options
CREATE POLICY "Poll options are viewable by everyone" 
  ON poll_options FOR SELECT 
  USING (true);

-- Only authenticated users who own the poll can create options
CREATE POLICY "Users can create poll options for their polls" 
  ON poll_options FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()
    )
  );

-- Only authenticated users who own the poll can update options
CREATE POLICY "Users can update poll options for their polls" 
  ON poll_options FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()
    )
  );

-- Only authenticated users who own the poll can delete options
CREATE POLICY "Users can delete poll options for their polls" 
  ON poll_options FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()
    )
  );

-- Votes policies
-- Anyone can view vote counts
CREATE POLICY "Votes are viewable by everyone" 
  ON votes FOR SELECT 
  USING (true);

-- Only authenticated users can vote
CREATE POLICY "Authenticated users can vote" 
  ON votes FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update votes
CREATE POLICY "Users cannot update votes" 
  ON votes FOR UPDATE 
  TO authenticated 
  USING (false);

-- Users can only delete their own votes
CREATE POLICY "Users can delete their own votes" 
  ON votes FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);