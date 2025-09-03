import type { PollData, PollOption } from './poll-types';

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation configuration
 */
const VALIDATION_CONFIG = {
  question: {
    minLength: 1,
    maxLength: 500,
  },
  option: {
    minLength: 1,
    maxLength: 200,
  },
  options: {
    minCount: 2,
    maxCount: 10,
  }
};

/**
 * Validate a single poll option
 * @param option - The poll option to validate
 * @param index - The index of the option (for error messaging)
 * @returns ValidationError[] - Array of validation errors
 */
function validatePollOption(option: PollOption, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!option.text) {
    errors.push({
      field: `options[${index}].text`,
      message: `Option ${index + 1} text is required`,
      code: 'OPTION_TEXT_REQUIRED'
    });
    return errors;
  }
  
  const trimmedText = option.text.trim();
  
  if (trimmedText.length === 0) {
    errors.push({
      field: `options[${index}].text`,
      message: `Option ${index + 1} text cannot be empty`,
      code: 'OPTION_TEXT_EMPTY'
    });
  } else if (trimmedText.length < VALIDATION_CONFIG.option.minLength) {
    errors.push({
      field: `options[${index}].text`,
      message: `Option ${index + 1} text must be at least ${VALIDATION_CONFIG.option.minLength} character`,
      code: 'OPTION_TEXT_TOO_SHORT'
    });
  } else if (trimmedText.length > VALIDATION_CONFIG.option.maxLength) {
    errors.push({
      field: `options[${index}].text`,
      message: `Option ${index + 1} text cannot exceed ${VALIDATION_CONFIG.option.maxLength} characters`,
      code: 'OPTION_TEXT_TOO_LONG'
    });
  }
  
  return errors;
}

/**
 * Validate poll question
 * @param question - The poll question to validate
 * @returns ValidationError[] - Array of validation errors
 */
function validatePollQuestion(question: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!question) {
    errors.push({
      field: 'question',
      message: 'Poll question is required',
      code: 'QUESTION_REQUIRED'
    });
    return errors;
  }
  
  const trimmedQuestion = question.trim();
  
  if (trimmedQuestion.length === 0) {
    errors.push({
      field: 'question',
      message: 'Poll question cannot be empty',
      code: 'QUESTION_EMPTY'
    });
  } else if (trimmedQuestion.length < VALIDATION_CONFIG.question.minLength) {
    errors.push({
      field: 'question',
      message: `Poll question must be at least ${VALIDATION_CONFIG.question.minLength} character`,
      code: 'QUESTION_TOO_SHORT'
    });
  } else if (trimmedQuestion.length > VALIDATION_CONFIG.question.maxLength) {
    errors.push({
      field: 'question',
      message: `Poll question cannot exceed ${VALIDATION_CONFIG.question.maxLength} characters`,
      code: 'QUESTION_TOO_LONG'
    });
  }
  
  return errors;
}

/**
 * Validate poll options array
 * @param options - The poll options to validate
 * @returns ValidationError[] - Array of validation errors
 */
function validatePollOptions(options: PollOption[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!options || !Array.isArray(options)) {
    errors.push({
      field: 'options',
      message: 'Poll options are required',
      code: 'OPTIONS_REQUIRED'
    });
    return errors;
  }
  
  if (options.length < VALIDATION_CONFIG.options.minCount) {
    errors.push({
      field: 'options',
      message: `At least ${VALIDATION_CONFIG.options.minCount} options are required`,
      code: 'OPTIONS_TOO_FEW'
    });
  }
  
  if (options.length > VALIDATION_CONFIG.options.maxCount) {
    errors.push({
      field: 'options',
      message: `Cannot have more than ${VALIDATION_CONFIG.options.maxCount} options`,
      code: 'OPTIONS_TOO_MANY'
    });
  }
  
  // Validate individual options
  options.forEach((option, index) => {
    errors.push(...validatePollOption(option, index));
  });
  
  // Check for duplicate options
  const optionTexts = options.map(option => option.text?.trim().toLowerCase()).filter(Boolean);
  const duplicates = optionTexts.filter((text, index) => optionTexts.indexOf(text) !== index);
  
  if (duplicates.length > 0) {
    errors.push({
      field: 'options',
      message: 'Duplicate options are not allowed',
      code: 'OPTIONS_DUPLICATE'
    });
  }
  
  return errors;
}

/**
 * Validate expiration date
 * @param expiresAt - The expiration date string
 * @returns ValidationError[] - Array of validation errors
 */
function validateExpirationDate(expiresAt?: string | null): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (expiresAt) {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    
    if (isNaN(expirationDate.getTime())) {
      errors.push({
        field: 'expiresAt',
        message: 'Invalid expiration date format',
        code: 'EXPIRATION_INVALID_FORMAT'
      });
    } else if (expirationDate <= now) {
      errors.push({
        field: 'expiresAt',
        message: 'Expiration date must be in the future',
        code: 'EXPIRATION_IN_PAST'
      });
    }
  }
  
  return errors;
}

/**
 * Comprehensive poll data validation
 * @param data - The poll data to validate
 * @returns ValidationResult - The validation result with errors if any
 */
export function validatePollData(data: PollData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate question
  errors.push(...validatePollQuestion(data.question));
  
  // Validate options
  errors.push(...validatePollOptions(data.options));
  
  // Validate expiration date
  errors.push(...validateExpirationDate(data.expiresAt));
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Simple validation that returns the first error message or null
 * @param data - The poll data to validate
 * @returns string | null - The first error message or null if valid
 */
export function validatePollDataSimple(data: PollData): string | null {
  const result = validatePollData(data);
  return result.isValid ? null : result.errors[0].message;
}

/**
 * Validate poll ID format
 * @param pollId - The poll ID to validate
 * @returns ValidationError[] - Array of validation errors
 */
export function validatePollId(pollId: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!pollId) {
    errors.push({
      field: 'pollId',
      message: 'Poll ID is required',
      code: 'POLL_ID_REQUIRED'
    });
  } else if (typeof pollId !== 'string') {
    errors.push({
      field: 'pollId',
      message: 'Poll ID must be a string',
      code: 'POLL_ID_INVALID_TYPE'
    });
  } else if (pollId.trim().length === 0) {
    errors.push({
      field: 'pollId',
      message: 'Poll ID cannot be empty',
      code: 'POLL_ID_EMPTY'
    });
  }
  
  return errors;
}

/**
 * Validate option ID format
 * @param optionId - The option ID to validate
 * @returns ValidationError[] - Array of validation errors
 */
export function validateOptionId(optionId: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!optionId) {
    errors.push({
      field: 'optionId',
      message: 'Option ID is required',
      code: 'OPTION_ID_REQUIRED'
    });
  } else if (typeof optionId !== 'string') {
    errors.push({
      field: 'optionId',
      message: 'Option ID must be a string',
      code: 'OPTION_ID_INVALID_TYPE'
    });
  } else if (optionId.trim().length === 0) {
    errors.push({
      field: 'optionId',
      message: 'Option ID cannot be empty',
      code: 'OPTION_ID_EMPTY'
    });
  }
  
  return errors;
}
