/**
 * @file time.ts
 * @brief 12-Hour (AM/PM) Time Formatting Utilities.
 * @details Converts 24-hour time strings (HH:mm) into 12-hour strings (hh:mm AM/PM),
 *          formats ranges, and converts any 24h occurrences inside text/messages.
 * @author Senior Full-Stack Software Architect
 * @since 2026-10-08
 */

/**
 * Converts a 24-hour time string ("14:30", "9:00", etc.) to 12-hour format ("02:30 PM", "09:00 AM").
 */
export function formatTimeTo12h(timeStr?: string | null): string {
  if (!timeStr) return '';
  const clean = String(timeStr).trim();
  if (!clean) return '';

  // If already formatted with AM or PM, return as is
  if (/(am|pm)/i.test(clean)) return clean;

  const parts = clean.split(':');
  if (parts.length < 2) return clean;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);

  if (isNaN(hours)) return clean;

  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const formattedHours = hours.toString().padStart(2, '0');
  return `${formattedHours}:${minutes} ${period}`;
}

/**
 * Formats a start and end time range in 12h AM/PM format.
 * Example: formatTimeRange12h("14:00", "14:15") => "02:00 PM – 02:15 PM"
 */
export function formatTimeRange12h(
  startTime?: string | null,
  endTime?: string | null,
  separator: string = ' – '
): string {
  if (!startTime && !endTime) return '';
  if (startTime && !endTime) return formatTimeTo12h(startTime);
  if (!startTime && endTime) return formatTimeTo12h(endTime);
  return `${formatTimeTo12h(startTime)}${separator}${formatTimeTo12h(endTime)}`;
}

/**
 * Replaces any 24h time pattern (HH:mm) in a paragraph or message with 12h format (hh:mm AM/PM).
 * Does not touch times that are already followed by AM or PM.
 */
export function formatTimeString12h(text?: string | null): string {
  if (!text) return '';
  return text.replace(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])(?!\s*(?:AM|PM|am|pm))\b/g, (_match, h, m) => {
    let hours = parseInt(h, 10);
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours.toString().padStart(2, '0')}:${m} ${period}`;
  });
}
