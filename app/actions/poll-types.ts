// Poll-related types and interfaces

export interface PollOption {
  id?: string;
  text: string;
  votes?: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  expiresAt?: string | null;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  user_id: string;
  created_at: string;
  expires_at: string | null;
}

export interface UserPoll {
  id: string;
  question: string;
  created_at: string;
  expires_at: string | null;
  user_id: string;
  totalVotes: number;
  isExpired: boolean;
  status: 'ongoing' | 'expired';
}

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface VoteStatus {
  hasVoted: boolean;
  optionId?: string | null;
  error?: string;
}

export interface DatabasePoll {
  id: string;
  question: string;
  created_at: string;
  expires_at: string | null;
  user_id: string;
  poll_options: DatabasePollOption[];
}

export interface DatabasePollOption {
  id: string;
  option_text: string;
  votes: number;
  poll_id: string;
}

export interface UserAuthData {
  id: string;
  email?: string;
}

export type PollStatus = 'ongoing' | 'expired';

export interface PollCreationResult {
  pollId: string;
}

export interface PollOperationError extends Error {
  code?: string;
  details?: string;
}
