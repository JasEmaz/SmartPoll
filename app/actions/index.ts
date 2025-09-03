// Main poll actions (public API)
export * from './poll-actions';

// Individual module exports for advanced usage
export * from './poll-types';
export * from './poll-client';
export * from './poll-auth';
export * from './poll-validation';
export * from './poll-operations';
export * from './poll-errors';

// Convenience re-exports
export { getSupabaseClient } from './poll-client';
export { getCurrentUser, verifyPollOwnership } from './poll-auth';
export { validatePollData, validatePollDataSimple } from './poll-validation';
export { handleError, createSuccessResponse } from './poll-errors';
