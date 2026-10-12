/**
 * @file teams.ts
 * @brief Canonical Team Definitions, Hierarchies, and Head Pool Classifications for IEEE ECU SB.
 * @details Establishes the authoritative taxonomy for branch committees:
 *          - Tech Pool: General, Software, Hardware
 *          - Media Pool (Conceptual subset of Non-Tech): Visuals, Graphics, Marketing
 *          - Operations Pool (Conceptual subset of Non-Tech): PR & Logistics, Events, HR
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

export type BroadCategory = 'TECH' | 'NON_TECH';
export type ConceptualCategory = 'TECH' | 'MEDIA' | 'OPERATIONS';

export type HeadCategory =
  | 'TECH_HEAD'
  | 'MEDIA_HEAD'
  | 'PR_HEAD'
  | 'EVENTS_HEAD'
  | 'HR_HEAD';

export interface TeamDefinition {
  id: string;
  name: string;
  broadCategory: BroadCategory;
  conceptualCategory: ConceptualCategory;
  requiredHeadCategory: HeadCategory;
  description: string;
  color: string;
  iconName: string;
}

/**
 * @brief Canonical list of all teams in IEEE ECU SB recruitment.
 */
export const TEAMS: TeamDefinition[] = [
  // --- TECH TEAMS ---
  {
    id: 'general-tech',
    name: 'General',
    broadCategory: 'TECH',
    conceptualCategory: 'TECH',
    requiredHeadCategory: 'TECH_HEAD',
    description: 'Core engineering, cross-disciplinary research, innovation, and embedded prototypes.',
    color: '#023260',
    iconName: 'Cpu',
  },
  {
    id: 'software',
    name: 'Software',
    broadCategory: 'TECH',
    conceptualCategory: 'TECH',
    requiredHeadCategory: 'TECH_HEAD',
    description: 'Full-stack web/mobile development, algorithms, competitive programming, and cloud backends.',
    color: '#00a1c0',
    iconName: 'Code2',
  },
  {
    id: 'hardware',
    name: 'Hardware',
    broadCategory: 'TECH',
    conceptualCategory: 'TECH',
    requiredHeadCategory: 'TECH_HEAD',
    description: 'PCB design, microcontrollers, IoT devices, robotics, and circuit architecture.',
    color: '#1e40af',
    iconName: 'CircuitBoard',
  },

  // --- NON-TECH: OPERATIONS TEAMS ---
  {
    id: 'pr-logistics',
    name: 'PR & Logistics',
    broadCategory: 'NON_TECH',
    conceptualCategory: 'OPERATIONS',
    requiredHeadCategory: 'PR_HEAD',
    description: 'Responsible for public relations, VIP handling, corporate sponsorships, and procurement of event logistics.',
    color: '#b45309',
    iconName: 'Building2',
  },
  {
    id: 'events',
    name: 'Events',
    broadCategory: 'NON_TECH',
    conceptualCategory: 'OPERATIONS',
    requiredHeadCategory: 'EVENTS_HEAD',
    description: 'Responsible for planning and organizing branch events, conferences, and workshops.',
    color: '#be123c',
    iconName: 'CalendarCheck2',
  },
  {
    id: 'hr',
    name: 'HR',
    broadCategory: 'NON_TECH',
    conceptualCategory: 'OPERATIONS',
    requiredHeadCategory: 'HR_HEAD',
    description: 'Member development, performance appraisal, internal culture, morale, and conflict mediation.',
    color: '#4338ca',
    iconName: 'UserCheck',
  },

  // --- NON-TECH: MEDIA TEAMS ---
  {
    id: 'visuals',
    name: 'Visuals',
    broadCategory: 'NON_TECH',
    conceptualCategory: 'MEDIA',
    requiredHeadCategory: 'MEDIA_HEAD',
    description: 'Cinematography, dynamic video editing, motion design, and event after-movies.',
    color: '#0f766e',
    iconName: 'Video',
  },
  {
    id: 'graphics',
    name: 'Graphics',
    broadCategory: 'NON_TECH',
    conceptualCategory: 'MEDIA',
    requiredHeadCategory: 'MEDIA_HEAD',
    description: 'Brand identity design, poster illustrations, social media banners, and print assets.',
    color: '#7c3aed',
    iconName: 'Palette',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    broadCategory: 'NON_TECH',
    conceptualCategory: 'MEDIA',
    requiredHeadCategory: 'MEDIA_HEAD',
    description: 'Campaign strategizing, content writing, social media management, and growth analytics.',
    color: '#c2410c',
    iconName: 'Megaphone',
  },
];

export const TECH_TEAMS = TEAMS.filter((t) => t.broadCategory === 'TECH');
export const NON_TECH_TEAMS = TEAMS.filter((t) => t.broadCategory === 'NON_TECH');
export const MEDIA_TEAMS = TEAMS.filter((t) => t.conceptualCategory === 'MEDIA');

/**
 * @brief Helper to look up team definition by ID or case-insensitive name.
 */
export function findTeam(idOrName: string): TeamDefinition | undefined {
  const query = idOrName.trim().toLowerCase();
  return TEAMS.find(
    (t) => t.id.toLowerCase() === query || t.name.toLowerCase() === query
  );
}
