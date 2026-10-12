/**
 * @file headMatcher.ts
 * @brief Participant Resolution Engine for Multi-Disciplinary Single Interviews.
 * @details Solves required Head categories based on applicant team choices:
 *          - Tech teams (General, Software, Hardware) -> TECH_HEAD (any Tech head pool member)
 *          - Media teams (Visuals, Graphics, Marketing) -> MEDIA_HEAD (any Media head pool member)
 *          - PR & Logistics -> PR_HEAD
 *          - Events -> EVENTS_HEAD
 *          - HR -> HR_HEAD
 *          - An applicant receives ONE interview; if applied to two teams, ALL required
 *            heads must be simultaneously available alongside the assigned HR.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { HeadCategory, TeamDefinition } from '../constants/teams.js';

export interface RequiredParticipants {
  requiresHR: boolean; // Always true
  requiredHeadCategories: HeadCategory[];
  summaryText: string;
}

/**
 * @brief Computes the set of distinct Head categories required to conduct the single interview.
 * @param selectedTeams Array of team definitions the applicant applied for.
 * @returns Structured participant requirements.
 */
export function getRequiredParticipants(selectedTeams: TeamDefinition[]): RequiredParticipants {
  const distinctHeadCategories = new Set<HeadCategory>();

  for (const team of selectedTeams) {
    distinctHeadCategories.add(team.requiredHeadCategory);
  }

  const headCategoriesArray = Array.from(distinctHeadCategories);

  const headLabels: Record<HeadCategory, string> = {
    TECH_HEAD: 'Tech Head (General/Software/Hardware)',
    MEDIA_HEAD: 'Media Head (Visuals/Graphics/Marketing)',
    PR_HEAD: 'PR & Logistics Head',
    EVENTS_HEAD: 'Events Head',
    HR_HEAD: 'HR Head',
  };

  const participantLabels = [
    'Assigned HR',
    ...headCategoriesArray.map((cat) => headLabels[cat]),
  ];

  return {
    requiresHR: true,
    requiredHeadCategories: headCategoriesArray,
    summaryText: participantLabels.join(' + '),
  };
}
