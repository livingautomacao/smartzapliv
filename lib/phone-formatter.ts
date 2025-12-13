/**
 * Phone Number Validation and Formatting
 *
 * Uses libphonenumber-js for robust international phone validation
 * Ported from NossoFlow
 */

import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    country?: string;
    countryCallingCode?: string;
    nationalNumber?: string;
    type?: string;
  };
}

export interface ProcessedPhone {
  normalized: string;
  validation: PhoneValidationResult;
}

/**
 * Validates a phone number using libphonenumber-js
 * Provides detailed validation with country detection
 *
 * @param phone - Phone number to validate (can include spaces, hyphens, parentheses)
 * @param defaultCountry - Default country code if number doesn't include country prefix
 * @returns Validation result with detailed error message if invalid
 */
export function validatePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = 'BR'
): PhoneValidationResult {
  const trimmed = phone.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Número de telefone não pode ser vazio',
    };
  }

  try {
    // Check if valid using libphonenumber-js
    const isValid = isValidPhoneNumber(trimmed, defaultCountry);

    if (!isValid) {
      // Try to parse to get more specific error
      try {
        const parsed = parsePhoneNumber(trimmed, defaultCountry);

        if (!parsed) {
          return {
            isValid: false,
            error: 'Formato de número inválido',
          };
        }

        // Check if it's a possible number
        if (!parsed.isPossible()) {
          const countryLabel = parsed.country || 'este país';
          return {
            isValid: false,
            error: `Número inválido para ${countryLabel}. Verifique a quantidade de dígitos.`,
          };
        }

        return {
          isValid: false,
          error: 'Número não é válido para WhatsApp',
        };
      } catch {
        return {
          isValid: false,
          error: 'Formato de número inválido. Use formato internacional (+5521999999999)',
        };
      }
    }

    // Parse to verify it's a mobile number (WhatsApp requires mobile)
    const parsed = parsePhoneNumber(trimmed, defaultCountry);

    if (parsed && parsed.getType() && !['MOBILE', 'FIXED_LINE_OR_MOBILE'].includes(parsed.getType()!)) {
      return {
        isValid: false,
        error: 'WhatsApp requer números de celular (não aceita fixos)',
      };
    }

    return {
      isValid: true,
      metadata: {
        country: parsed?.country,
        countryCallingCode: parsed?.countryCallingCode,
        nationalNumber: parsed?.nationalNumber,
        type: parsed?.getType(),
      }
    };
  } catch {
    return {
      isValid: false,
      error: 'Formato inválido. Use formato internacional: +5521999999999',
    };
  }
}

/**
 * Validates a phone number for general contact/profile usage (not WhatsApp-specific).
 * Unlike validatePhoneNumber(), this does NOT require the number to be mobile.
 */
export function validateAnyPhoneNumber(
  phone: string,
  defaultCountry: CountryCode = 'BR'
): PhoneValidationResult {
  const trimmed = phone.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Número de telefone não pode ser vazio',
    };
  }

  try {
    const isValid = isValidPhoneNumber(trimmed, defaultCountry);
    if (!isValid) {
      try {
        const parsed = parsePhoneNumber(trimmed, defaultCountry);
        if (!parsed) {
          return { isValid: false, error: 'Formato de número inválido' };
        }
        if (!parsed.isPossible()) {
          const countryLabel = parsed.country || 'este país';
          return {
            isValid: false,
            error: `Número inválido para ${countryLabel}. Verifique a quantidade de dígitos.`,
          };
        }
        return { isValid: false, error: 'Número de telefone inválido' };
      } catch {
        return {
          isValid: false,
          error: 'Formato de número inválido. Use formato internacional (+5521999999999)',
        };
      }
    }

    const parsed = parsePhoneNumber(trimmed, defaultCountry);
    return {
      isValid: true,
      metadata: {
        country: parsed?.country,
        countryCallingCode: parsed?.countryCallingCode,
        nationalNumber: parsed?.nationalNumber,
        type: parsed?.getType(),
      },
    };
  } catch {
    return {
      isValid: false,
      error: 'Formato inválido. Use formato internacional: +5521999999999',
    };
  }
}

/**
 * Normalizes phone number to E.164 international format
 * Required format for WhatsApp API: +XXXXXXXXXXX
 *
 * @param phone - Phone number to normalize
 * @param defaultCountry - Default country if not specified in number
 * @returns Normalized phone number in E.164 format (+5521999999999)
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = 'BR'
): string {
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry);

    if (parsed) {
      // Return E.164 format (international format without spaces)
      return parsed.number;
    }

    // Fallback: try to clean and add + if missing
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  } catch {
    // Fallback for invalid numbers
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      // Assume Brazilian if no country code
      if (cleaned.length === 11) {
        cleaned = '+55' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }
}

/**
 * Formats phone number for display with proper spacing
 *
 * @param phone - Phone number in any format
 * @param style - Format style ('international' or 'national')
 * @returns Formatted phone number for display
 */
export function formatPhoneNumberDisplay(
  phone: string,
  style: 'international' | 'national' = 'international'
): string {
  try {
    const parsed = parsePhoneNumber(phone);

    if (parsed) {
      return style === 'international'
        ? parsed.formatInternational() // +55 21 99999-9999
        : parsed.formatNational();      // (21) 99999-9999
    }

    return phone;
  } catch {
    return phone;
  }
}

/**
 * Validates and normalizes phone number in one step
 *
 * @param phone - Phone number to process
 * @param defaultCountry - Default country code
 * @returns Object with normalized number and validation result
 */
export function processPhoneNumber(
  phone: string,
  defaultCountry: CountryCode = 'BR'
): ProcessedPhone {
  const validation = validatePhoneNumber(phone, defaultCountry);
  const normalized = normalizePhoneNumber(phone, defaultCountry);

  return {
    normalized,
    validation,
  };
}

/**
 * Extracts country information from phone number
 *
 * @param phone - Phone number to analyze
 * @returns Country code and calling code, or null if invalid
 */
export function getPhoneCountryInfo(phone: string): {
  country: CountryCode | undefined;
  callingCode: string | undefined;
  flag: string | undefined;
} | null {
  try {
    const parsed = parsePhoneNumber(phone);

    if (parsed) {
      let flag: string | undefined;
      if (parsed.country) {
        flag = getCountryFlag(parsed.country);
      }

      return {
        country: parsed.country,
        callingCode: parsed.countryCallingCode,
        flag,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Gets emoji flag for country code
 */
function getCountryFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/**
 * Batch validates multiple phone numbers
 * Useful for CSV import validation
 *
 * @param phones - Array of phone numbers to validate
 * @returns Array of validation results
 */
export function validatePhoneNumbers(phones: string[]): Array<{
  phone: string;
  normalized: string;
  validation: PhoneValidationResult;
}> {
  return phones.map(phone => {
    const result = processPhoneNumber(phone);
    return {
      phone,
      ...result,
    };
  });
}
