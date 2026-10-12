/**
 * @file phone.ts
 * @brief Canonical Egyptian Mobile Phone Number Verification Utility.
 * @details Validates 11-digit Egyptian mobile numbers:
 *          - Must start with 0
 *          - Must have length exactly 11 digits
 *          - Leading 3 digits must be 010 (Vodafone), 011 (Etisalat), 012 (Orange), or 015 (WE)
 *          - Exactly 8 digits following the prefix
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

export interface PhoneValidationResult {
  isValid: boolean;
  cleanPhone: string;
  network?: 'Vodafone' | 'Etisalat' | 'Orange' | 'WE';
  errorMessage?: string;
}

/**
 * @brief Validates an Egyptian mobile phone number.
 * @param phone Raw phone number string from user input.
 * @returns PhoneValidationResult with validation flag, clean 11-digit phone, network operator, and error message.
 */
export function validateEgyptianPhoneNumber(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      cleanPhone: '',
      errorMessage: 'Phone number is required.',
    };
  }

  // Remove any whitespace, hyphens, parentheses
  let clean = phone.trim().replace(/[\s\-\(\)\.]/g, '');

  // Normalize international country codes (+20, 0020, or 20 followed by 10 digits)
  if (clean.startsWith('+20')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('0020')) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('20') && clean.length === 12) {
    clean = '0' + clean.slice(2);
  }

  if (!clean.startsWith('0')) {
    return {
      isValid: false,
      cleanPhone: clean,
      errorMessage: 'Phone number must start with 0 (e.g. 010, 011, 012, or 015).',
    };
  }

  if (clean.length !== 11) {
    return {
      isValid: false,
      cleanPhone: clean,
      errorMessage: `Phone number must be exactly 11 digits (currently ${clean.length} digits).`,
    };
  }

  if (!/^\d{11}$/.test(clean)) {
    return {
      isValid: false,
      cleanPhone: clean,
      errorMessage: 'Phone number must contain numeric digits only.',
    };
  }

  const prefix = clean.substring(0, 3);
  let network: 'Vodafone' | 'Etisalat' | 'Orange' | 'WE' | undefined;

  switch (prefix) {
    case '010':
      network = 'Vodafone';
      break;
    case '011':
      network = 'Etisalat';
      break;
    case '012':
      network = 'Orange';
      break;
    case '015':
      network = 'WE';
      break;
    default:
      return {
        isValid: false,
        cleanPhone: clean,
        errorMessage: 'Phone number must start with a valid Egyptian network prefix: 010 (Vodafone), 011 (Etisalat), 012 (Orange), or 015 (WE).',
      };
  }

  return {
    isValid: true,
    cleanPhone: clean,
    network,
  };
}
