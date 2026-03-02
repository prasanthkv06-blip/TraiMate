// ---------------------------------------------------------------------------
// Input validation & sanitisation utilities
// ---------------------------------------------------------------------------

export type FieldName =
  | 'tripName'
  | 'chatMessage'
  | 'documentField'
  | 'passportNumber'
  | 'expenseAmount';

// ---------------------------------------------------------------------------
// Sanitisation
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags, `<script>` blocks, `javascript:` protocol URIs and
 * inline `on*=` event-handler attributes from arbitrary text input.
 */
export function sanitizeText(input: string): string {
  let result = input;

  // Remove HTML tags (including self-closing)
  result = result.replace(/<[^>]*>/g, '');

  // Remove javascript: protocol references (case-insensitive)
  result = result.replace(/javascript\s*:/gi, '');

  // Remove inline event-handler attributes (e.g. onclick=, onload=)
  result = result.replace(/on\w+\s*=/gi, '');

  return result.trim();
}

// ---------------------------------------------------------------------------
// Field validation
// ---------------------------------------------------------------------------

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const FIELD_RULES: Record<FieldName, (value: string) => ValidationResult> = {
  tripName(value) {
    if (value.length > 100) {
      return { valid: false, error: 'Trip name must be 100 characters or fewer.' };
    }
    if (/[<>{}]/.test(value)) {
      return { valid: false, error: 'Trip name must not contain <, >, {, or } characters.' };
    }
    return { valid: true };
  },

  chatMessage(value) {
    if (value.length > 2000) {
      return { valid: false, error: 'Message must be 2,000 characters or fewer.' };
    }
    return { valid: true };
  },

  documentField(value) {
    if (value.length > 200) {
      return { valid: false, error: 'Field must be 200 characters or fewer.' };
    }
    // Allow alphanumeric + common punctuation (spaces, hyphens, periods, commas,
    // slashes, apostrophes, parentheses, colons, and #)
    if (!/^[A-Za-z0-9\s\-.,/'():#]*$/.test(value)) {
      return { valid: false, error: 'Field contains invalid characters.' };
    }
    return { valid: true };
  },

  passportNumber(value) {
    if (!/^[A-Z0-9]{5,20}$/i.test(value)) {
      return {
        valid: false,
        error: 'Passport number must be 5–20 alphanumeric characters.',
      };
    }
    return { valid: true };
  },

  expenseAmount(value) {
    // Must look like a valid non-negative number
    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      return { valid: false, error: 'Amount must be a valid number (up to 2 decimal places).' };
    }
    const num = parseFloat(value);
    if (num < 0 || num > 9_999_999.99) {
      return { valid: false, error: 'Amount must be between 0 and 9,999,999.99.' };
    }
    return { valid: true };
  },
};

/**
 * Validate an arbitrary text field against one of the predefined rule-sets.
 */
export function validateField(
  value: string,
  fieldName: FieldName,
): ValidationResult {
  const rule = FIELD_RULES[fieldName];
  if (!rule) {
    return { valid: false, error: `Unknown field: ${fieldName}` };
  }
  return rule(value);
}

/**
 * Validate a numeric expense amount directly (without stringifying first).
 */
export function validateExpenseAmount(value: number): ValidationResult {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return { valid: false, error: 'Amount must be a valid number.' };
  }
  if (value < 0 || value > 9_999_999.99) {
    return { valid: false, error: 'Amount must be between 0 and 9,999,999.99.' };
  }
  return { valid: true };
}
