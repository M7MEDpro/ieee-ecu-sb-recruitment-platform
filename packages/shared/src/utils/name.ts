/**
 * @file name.ts
 * @brief Utilities for applicant name normalization and first name extraction.
 * @author Senior Full-Stack Software Architect
 * @since 2026-10-08
 */

/**
 * @brief Extracts the first name from a full name string.
 *        Works seamlessly with Arabic, English, and composite names.
 * @example
 * extractFirstName("Mohamed Ahmed Ali") => "Mohamed"
 * extractFirstName("Sara Mohamed") => "Sara"
 * extractFirstName("   Ahmed   Hassan  ") => "Ahmed"
 */
export function extractFirstName(fullName?: string | null): string {
  if (!fullName || typeof fullName !== 'string') return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  return parts[0] || '';
}

/**
 * @brief Replaces first name and name placeholders in template text.
 *        Supports {{first_name}}, {{firstName}}, {{first name}}, and localized placeholders,
 *        as well as {{name}} for the complete full name.
 */
export function interpolateNamePlaceholders(text: string, fullName?: string | null): string {
  if (!text) return '';
  const safeFullName = fullName || '';
  const firstName = extractFirstName(safeFullName);

  return text
    .replace(/\{\{\s*(first_name|firstName|first\s*name|الاسم_الاول|الاسم\s*الأول)\s*\}\}/gi, firstName || safeFullName)
    .replace(/\{\{\s*name\s*\}\}/gi, safeFullName);
}
