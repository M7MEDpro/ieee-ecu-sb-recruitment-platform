/**
 * @file nationalId.ts
 * @brief High-Integrity Egyptian National ID Verification Algorithm.
 * @details Validates the 14-digit Egyptian National Identification number:
 *          - Exact 14 numeric digits.
 *          - Century digit (2 for 1900-1999, 3 for 2000-2099).
 *          - Valid birth year, month (01-12), and day (01-31 with calendar validity).
 *          - Valid Egyptian governorate code (01-35, 88).
 *          - Check digit presence.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

export interface NationalIdValidationResult {
  isValid: boolean;
  errorMessage?: string;
  birthDate?: Date;
  gender?: 'MALE' | 'FEMALE';
  governorate?: string;
}

const EGYPTIAN_GOVERNORATES: Record<string, string> = {
  '01': 'Cairo',
  '02': 'Alexandria',
  '03': 'Port Said',
  '04': 'Suez',
  '11': 'Damietta',
  '12': 'Dakahlia',
  '13': 'Sharkia',
  '14': 'Qalyubia',
  '15': 'Kafr El Sheikh',
  '16': 'Gharbia',
  '17': 'Monufia',
  '18': 'Beheira',
  '19': 'Ismailia',
  '21': 'Giza',
  '22': 'Beni Suef',
  '23': 'Fayoum',
  '24': 'Minya',
  '25': 'Asyut',
  '26': 'Sohag',
  '27': 'Qena',
  '28': 'Aswan',
  '29': 'Luxor',
  '31': 'Red Sea',
  '32': 'New Valley',
  '33': 'Matrouh',
  '34': 'North Sinai',
  '35': 'South Sinai',
  '88': 'Foreign / Outside Egypt',
};

/**
 * @brief Validates an Egyptian National ID string.
 * @param nationalId 14-digit string.
 * @returns Validation outcome with parsed metadata.
 */
export function validateEgyptianNationalId(nationalId: string): NationalIdValidationResult {
  const cleanId = nationalId.trim();

  if (!cleanId) {
    return { isValid: false, errorMessage: 'National ID is required.' };
  }

  if (!/^\d{14}$/.test(cleanId)) {
    return {
      isValid: false,
      errorMessage: 'National ID must consist of exactly 14 numeric digits.',
    };
  }

  const centuryDigit = parseInt(cleanId[0], 10);
  if (centuryDigit !== 2 && centuryDigit !== 3) {
    return {
      isValid: false,
      errorMessage: 'Invalid National ID: Leading century digit must be 2 (1900s) or 3 (2000s).',
    };
  }

  const centuryPrefix = centuryDigit === 2 ? '19' : '20';
  const yearStr = centuryPrefix + cleanId.substring(1, 3);
  const monthStr = cleanId.substring(3, 5);
  const dayStr = cleanId.substring(5, 7);

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) {
    return {
      isValid: false,
      errorMessage: `Invalid National ID: Birth month (${monthStr}) must be between 01 and 12.`,
    };
  }

  // Validate day against actual month and leap year
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return {
      isValid: false,
      errorMessage: `Invalid National ID: Day (${dayStr}) is invalid for month ${monthStr}/${yearStr}.`,
    };
  }

  const birthDate = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  if (birthDate > today) {
    return {
      isValid: false,
      errorMessage: 'Invalid National ID: Date of birth cannot be in the future.',
    };
  }

  // Check governorate code
  const govCode = cleanId.substring(7, 9);
  const governorate = EGYPTIAN_GOVERNORATES[govCode];
  if (!governorate) {
    return {
      isValid: false,
      errorMessage: `Invalid National ID: Unrecognized governorate code (${govCode}).`,
    };
  }

  // Check gender digit (digit 13: odd = male, even = female)
  const genderDigit = parseInt(cleanId[12], 10);
  const gender: 'MALE' | 'FEMALE' = genderDigit % 2 === 1 ? 'MALE' : 'FEMALE';

  return {
    isValid: true,
    birthDate,
    gender,
    governorate,
  };
}

/**
 * @brief Identifies gender from Egyptian National ID or applicant object.
 * @details Digit 13 (index 12): Even = FEMALE, Odd = MALE.
 */
export function getApplicantGender(applicantOrNationalId?: any): 'FEMALE' | 'MALE' | 'UNKNOWN' {
  if (!applicantOrNationalId) return 'UNKNOWN';

  let nationalId = typeof applicantOrNationalId === 'string'
    ? applicantOrNationalId
    : (applicantOrNationalId.nationalId || applicantOrNationalId.national_id);

  if (typeof applicantOrNationalId === 'object' && applicantOrNationalId.gender) {
    const g = String(applicantOrNationalId.gender).toUpperCase();
    if (g.includes('FEMALE') || g.includes('GIRL') || g.includes('بنت') || g.includes('أنثى')) return 'FEMALE';
    if (g.includes('MALE') || g.includes('BOY') || g.includes('ولد') || g.includes('ذكر')) return 'MALE';
  }

  if (!nationalId) return 'UNKNOWN';
  const clean = String(nationalId)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/\D/g, '');

  if (clean.length >= 13) {
    const digit = parseInt(clean[12], 10);
    if (!isNaN(digit)) {
      return digit % 2 === 0 ? 'FEMALE' : 'MALE';
    }
  }
  return 'UNKNOWN';
}

