/**
 * @file teamRules.ts
 * @brief Authoritative Validation Engine for Applicant Committee Selections.
 * @details Strictly enforces the IEEE ECU SB recruitment business rules:
 *          - Rule 1: Exactly 0 or 1 Tech team.
 *          - Rule 2: Exactly 0 or 1 Non-Tech team.
 *          - Rule 3: Total selected teams must be >= 1 (applicant cannot submit 0 teams).
 *          - Rule 4: Total selected teams must be <= 2.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { findTeam, TeamDefinition } from '../constants/teams.js';

export interface TeamSelectionValidationResult {
  isValid: boolean;
  errorMessage?: string;
  techTeam?: TeamDefinition;
  nonTechTeam?: TeamDefinition;
  allSelectedTeams: TeamDefinition[];
}

/**
 * @brief Validates an applicant's chosen team identifiers.
 * @param selectedTeamIds Array of team IDs or names chosen by the applicant.
 * @returns Comprehensive validation outcome with structured committee objects.
 */
export function validateTeamSelection(selectedTeamIds: string[]): TeamSelectionValidationResult {
  if (!Array.isArray(selectedTeamIds) || selectedTeamIds.length === 0) {
    return {
      isValid: false,
      errorMessage: 'You must select at least one team to submit an application.',
      allSelectedTeams: [],
    };
  }

  // Deduplicate identifiers
  const uniqueIds = Array.from(new Set(selectedTeamIds.map((id) => id.trim())));

  const resolvedTeams: TeamDefinition[] = [];
  for (const id of uniqueIds) {
    const team = findTeam(id);
    if (!team) {
      return {
        isValid: false,
        errorMessage: `Unrecognized team selected: "${id}".`,
        allSelectedTeams: [],
      };
    }
    resolvedTeams.push(team);
  }

  const techTeams = resolvedTeams.filter((t) => t.broadCategory === 'TECH');
  const nonTechTeams = resolvedTeams.filter((t) => t.broadCategory === 'NON_TECH');

  if (resolvedTeams.length === 0) {
    return {
      isValid: false,
      errorMessage: 'You must select at least one team.',
      allSelectedTeams: [],
    };
  }

  if (techTeams.length > 1) {
    const names = techTeams.map((t) => t.name).join(' and ');
    return {
      isValid: false,
      errorMessage: `Invalid selection: You selected multiple Tech teams (${names}). You can choose at most ONE Tech team.`,
      allSelectedTeams: resolvedTeams,
    };
  }

  if (nonTechTeams.length > 1) {
    const names = nonTechTeams.map((t) => t.name).join(' and ');
    return {
      isValid: false,
      errorMessage: `Invalid selection: You selected multiple Non-Tech teams (${names}). You can choose at most ONE Non-Tech team.`,
      allSelectedTeams: resolvedTeams,
    };
  }

  return {
    isValid: true,
    techTeam: techTeams[0],
    nonTechTeam: nonTechTeams[0],
    allSelectedTeams: resolvedTeams,
  };
}
