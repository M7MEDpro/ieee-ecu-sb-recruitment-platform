'use client';

/**
 * @file TeamCard.tsx
 * @brief Interactive Selection Card Component for Recruitment Committees.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React from 'react';
import { Check } from 'lucide-react';
import { TeamDefinition } from '@ieee-recruitment/shared';

interface TeamCardProps {
  team: TeamDefinition;
  isSelected: boolean;
  onSelect: (team: TeamDefinition) => void;
  disabled?: boolean;
}

/**
 * @brief Interactive Committee Selection Card Component.
 * @param {TeamCardProps} props Properties including committee definition, selection state, and callback.
 * @return {JSX.Element} Rendered team card.
 */
export default function TeamCard({
  team,
  isSelected,
  onSelect,
  disabled = false,
}: TeamCardProps) {
  return (
    <div
      role="button"
      tabIndex={disabled && !isSelected ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={disabled && !isSelected}
      onClick={() => {
        if (!disabled || isSelected) {
          onSelect(team);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!disabled || isSelected) {
            onSelect(team);
          }
        }
      }}
      className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer border select-none outline-none focus-visible:ring-2 focus-visible:ring-[#00a1c0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#011c38] ${
        isSelected
          ? 'bg-gradient-to-br from-[#023260] to-[#011c38] border-red-500 shadow-lg shadow-red-900/25 ring-2 ring-red-500'
          : disabled
          ? 'bg-black/30 border-white/5 opacity-50 cursor-not-allowed'
          : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-red-500/30'
      }`}
    >
      {/* Header: Team Name & Selection Checkbox */}
      <div className="flex items-start justify-between gap-3">
        <h4
          className={`font-bold text-base transition-colors ${
            isSelected
              ? 'text-white font-extrabold'
              : 'text-red-400 group-hover:text-red-300'
          }`}
        >
          {team.name}
        </h4>

        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center border flex-shrink-0 transition-all ${
            isSelected
              ? 'bg-[#D92525] border-[#D92525] text-white shadow-sm'
              : 'border-white/20 bg-black/20 group-hover:border-white/40'
          }`}
        >
          {isSelected && <Check size={14} strokeWidth={3} />}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
        {team.description}
      </p>

      {isSelected && (
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-medium text-red-400">
          <span>✓ Selected committee</span>
          <span className="text-slate-400">Click to remove</span>
        </div>
      )}
    </div>
  );
}
