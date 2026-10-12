/**
 * @file CriteriaDescription.tsx
 * @brief Formatted Criterion Description Renderer with Multi-Point Parsing.
 * @details Parses bullet points, sub-points, and multilingual test prompts
 *          into a structured, readable visual checklist for interviewers.
 * @author IEEE ECU Student Branch
 */

'use client';

import React, { useMemo } from 'react';

interface CriteriaDescriptionProps {
  description?: string | null;
  className?: string;
  dotColor?: string;
}

interface ParsedPoint {
  text: string;
  isSubPoint: boolean;
  isHeaderIntro: boolean;
  isArabic: boolean;
}

/**
 * Checks if a string contains Arabic characters.
 */
export function isArabicText(text?: string | null): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Splits raw description text into individual points, correctly respecting:
 * - Leading and inline dashes (-Point or - Point or  -Point)
 * - Bullets (• or *)
 * - Sub-points (e.g. • Candidate A, • Candidate B)
 * - Conversational Arabic scenarios or question prompts
 * - Hyphenated words like "back-to-back", "off-theme", "time-management" which must NOT be split
 */
export function parseCriteriaPoints(rawText?: string | null): ParsedPoint[] {
  if (!rawText || typeof rawText !== 'string') return [];
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // Normalize newlines
  let normalized = trimmed.replace(/\r\n/g, '\n');

  // Insert a unique token at bullet points.
  // We match:
  // 1. Start of string bullet: ^\s*[-•*]\s*
  // 2. Dash/bullet preceded by whitespace, punctuation, or newline: (?:\s+|[?.!:\n])[-•*]\s*
  // But DO NOT match dashes between word characters with no space (e.g. back-to-back, off-theme).
  const POINT_TOKEN = '___CRITERIA_POINT_SPLIT___';
  const SUBPOINT_TOKEN = '___CRITERIA_SUBPOINT_SPLIT___';

  // Sub-points marked by bullet symbol • or *
  normalized = normalized.replace(/(?:^|\s+|[?.!:\n])[•*]\s*/g, () => {
    return `${SUBPOINT_TOKEN}`;
  });

  // Main points marked by - at start or preceded by space/punctuation/newline
  // Protect hyphenated words: word-word is not preceded by space/punctuation.
  normalized = normalized.replace(/^[-–—]\s*/, POINT_TOKEN);
  normalized = normalized.replace(/(?:[\s?.!:,\n]|^)[-–—]\s+/g, () => {
    return `${POINT_TOKEN}`;
  });
  // Also match dash followed immediately by a letter or Arabic character if preceded by space or punctuation
  normalized = normalized.replace(/(?:[\s?.!:,\n]|^)[-–—](?=[A-Za-z\u0600-\u06FF])/g, () => {
    return `${POINT_TOKEN}`;
  });

  // Also split on double or single newlines if they exist
  normalized = normalized.replace(/\n+/g, POINT_TOKEN);

  // Now split and collect
  const tokens = normalized.split(new RegExp(`(${POINT_TOKEN}|${SUBPOINT_TOKEN})`));
  const result: ParsedPoint[] = [];

  let currentType: 'MAIN' | 'SUB' = 'MAIN';

  for (const part of tokens) {
    if (part === POINT_TOKEN) {
      currentType = 'MAIN';
      continue;
    }
    if (part === SUBPOINT_TOKEN) {
      currentType = 'SUB';
      continue;
    }

    let clean = part.replace(/^[-–—•*]\s*/, '').trim();
    // Trim trailing stray dashes
    clean = clean.replace(/[-–—\s]+$/, '').trim();
    if (!clean || clean === '-' || clean === '–') continue;

    const isHeaderIntro = clean.endsWith(':');
    const isArabic = isArabicText(clean);

    result.push({
      text: clean,
      isSubPoint: currentType === 'SUB' || clean.toLowerCase().startsWith('candidate '),
      isHeaderIntro,
      isArabic,
    });
  }

  return result;
}

/**
 * @brief Formatted Criterion Description Component.
 * @param {CriteriaDescriptionProps} props Contains raw description string, styling, and bullet colors.
 * @return {JSX.Element | null} Formatted bullet list with multilingual awareness.
 */
export function CriteriaDescription({
  description,
  className = '',
  dotColor = 'bg-[#00c2e0]',
}: CriteriaDescriptionProps) {
  const points = useMemo(() => parseCriteriaPoints(description), [description]);

  if (!points || points.length === 0) {
    return null;
  }

  // Single sentence / paragraph
  if (points.length === 1 && !points[0].isSubPoint) {
    const pt = points[0];
    return (
      <div
        dir={pt.isArabic ? 'rtl' : 'ltr'}
        className={`text-xs text-slate-300 leading-relaxed break-words ${
          pt.isArabic ? 'text-right' : 'text-left'
        } ${className}`}
      >
        {pt.text}
      </div>
    );
  }

  // Multiple points: Render each point in its own row with an empty line (spacing) between each point
  return (
    <div className={`space-y-3.5 my-2.5 ${className}`}>
      {points.map((pt, idx) => {
        if (pt.isHeaderIntro) {
          return (
            <div
              key={idx}
              dir={pt.isArabic ? 'rtl' : 'ltr'}
              className={`text-xs font-semibold text-slate-200 leading-relaxed pt-1.5 break-words ${
                pt.isArabic ? 'text-right' : 'text-left'
              }`}
            >
              {pt.text}
            </div>
          );
        }

        return (
          <div
            key={idx}
            dir={pt.isArabic ? 'rtl' : 'ltr'}
            className={`flex items-start gap-2.5 transition-colors ${
              pt.isArabic ? 'text-right' : 'text-left'
            } ${
              pt.isSubPoint
                ? pt.isArabic
                  ? 'mr-4 sm:mr-6 pr-2.5 border-r-2 border-white/10'
                  : 'ml-4 sm:ml-6 pl-2.5 border-l-2 border-white/10'
                : ''
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                pt.isSubPoint ? 'bg-amber-400/80 mt-1.5' : `${dotColor} mt-1.5`
              } shrink-0`}
            />
            <span
              className={`text-xs leading-relaxed break-words flex-1 ${
                pt.isSubPoint ? 'text-slate-300 font-normal' : 'text-slate-200'
              }`}
            >
              {pt.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default CriteriaDescription;
