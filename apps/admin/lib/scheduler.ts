/**
 * @file scheduler.ts
 * @brief Autonomous Multi-Participant Scheduling Engine for IEEE ECU SB Interviews.
 * @details Solves the constrained interview matching problem respecting:
 *          - Single interview per applicant covering all applied committees.
 *          - Head category resolution (Tech Head pool, Media Head pool, PR, Events, HR).
 *          - Simultaneous multi-head attendance for cross-disciplinary applicants.
 *          - HR & Head availability windows.
 *          - Configurable duration (12m), buffer (3m), and mandatory breaks (15m).
 *          - 6-consecutive-interview rule with precise gap detection & counter reset.
 *          - Non-overlapping constraints (no double-booking of any HR or Head).
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import {
  HRAccount,
  HRAvailabilityWindow,
  HeadAvailabilityWindow,
  HeadCategory,
  TeamDefinition,
  getRequiredParticipants,
} from '@ieee-recruitment/shared';

export interface SchedulerConfig {
  interviewDurationMinutes: number; // default 12
  bufferMinutes: number; // default 3
  breakDurationMinutes: number; // default 15
  breakFrequencyInterviews: number; // default 6
  date?: string; // YYYY-MM-DD (legacy / single date)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  interviewMode?: 'ONLINE' | 'OFFLINE';
  location?: string;
  meetingLink?: string;
  selectedHrIds?: string[];
  hrMeetingLinks?: Record<string, string>;
  committeeIds?: string[];
}

export interface UnscheduledApplicantReport {
  applicantId: string;
  applicantName: string;
  appliedTeams: string[];
  requiredHeadCategories: HeadCategory[];
  reason: string;
}

export interface GeneratedScheduleSlot {
  applicantId: string;
  applicantName: string;
  applicantEmail?: string;
  applicantPhone: string;
  applicantFaculty?: string;
  applicantNationalId?: string;
  applicantGender?: 'FEMALE' | 'MALE' | 'UNKNOWN';
  appliedTeams: string[];
  hrId: string;
  hrName: string;
  assignedHeads: Array<{ name: string; category: HeadCategory }>;
  date: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  interviewMode?: 'ONLINE' | 'OFFLINE';
  location?: string;
  meetingLink?: string;
}

export interface SchedulingEngineResult {
  success: boolean;
  slots: GeneratedScheduleSlot[];
  unscheduled: UnscheduledApplicantReport[];
  totalScheduled: number;
  totalApplicants: number;
}

/**
 * @brief Converts 'HH:mm' string to minutes from midnight.
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/**
 * @brief Converts minutes from midnight to 'HH:mm' string.
 */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * @brief Identifies gender from Egyptian National ID or applicant object.
 * @details In the 14-digit Egyptian National ID standard:
 *          Digit 13 (second-to-last digit, index 12 in 0-indexed string):
 *          - Even (0, 2, 4, 6, 8) -> FEMALE (girls)
 *          - Odd (1, 3, 5, 7, 9)  -> MALE (boys)
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

/**
 * @brief Generates an array of 'YYYY-MM-DD' dates between startDate and endDate inclusive.
 */
export function getDatesInRange(startDate: string, endDate: string): string[] {
  if (!startDate && !endDate) return [];
  if (!startDate) return [endDate];
  if (!endDate) return [startDate];

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [startDate];
  }

  const dates: string[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * @brief Automatically generates an optimized interview timeline across date and time ranges.
 * @param applicants List of applicants with applied teams and national IDs.
 * @param hrAccounts List of available HR accounts.
 * @param hrWindows HR availability windows for the session.
 * @param headWindows Head availability windows for the session.
 * @param config Scheduler timing parameters (dates, daily times, durations, breaks).
 */
export function generateInterviewSchedule(
  applicants: Array<{
    id: string;
    fullName: string;
    email?: string;
    phoneNumber: string;
    nationalId?: string;
    faculty?: string;
    teams: TeamDefinition[];
  }>,
  hrAccounts: HRAccount[],
  hrWindows: HRAvailabilityWindow[],
  headWindows: HeadAvailabilityWindow[],
  config: SchedulerConfig,
  existingSlots: any[] = []
): SchedulingEngineResult {
  const {
    interviewDurationMinutes,
    bufferMinutes,
    breakDurationMinutes,
    breakFrequencyInterviews,
  } = config;

  const effectiveStartDate = config.startDate || config.date || new Date().toISOString().split('T')[0];
  const effectiveEndDate = config.endDate || effectiveStartDate;
  const dates = getDatesInRange(effectiveStartDate, effectiveEndDate);

  // Filter out Amar, and respect selectedHrIds if provided
  const activeHrAccounts = hrAccounts.filter(
    (h) => !h.name?.toLowerCase().includes('amar') &&
           (!config.selectedHrIds || config.selectedHrIds.length === 0 || config.selectedHrIds.includes(h.id))
  );

  // Sort applicants: Females (girls) first, then Males (boys), then Unknown
  const sortedApplicants = [...applicants].sort((a, b) => {
    const genderA = getApplicantGender(a.nationalId);
    const genderB = getApplicantGender(b.nationalId);

    const getPriority = (g: 'FEMALE' | 'MALE' | 'UNKNOWN') => {
      if (g === 'FEMALE') return 0;
      if (g === 'UNKNOWN') return 1;
      return 2;
    };

    return getPriority(genderA) - getPriority(genderB);
  });

  const slots: GeneratedScheduleSlot[] = [];
  const unscheduled: UnscheduledApplicantReport[] = [];
  let remainingApplicants = [...sortedApplicants];

  // Process day by day across the date range
  for (const currentDate of dates) {
    if (remainingApplicants.length === 0) break;

    const confStartMins = config.startTime ? timeToMinutes(config.startTime) : null;
    const confEndMins = config.endTime ? timeToMinutes(config.endTime) : null;

    // Filter HR windows for this date that are marked available
    let activeHrWindows = hrWindows.filter(
      (w) => w.date === currentDate &&
             w.isAvailable &&
             !w.hrName?.toLowerCase().includes('amar') &&
             (!config.selectedHrIds || config.selectedHrIds.length === 0 || config.selectedHrIds.includes(w.hrId))
    );

    if (activeHrWindows.length > 0) {
      if (confStartMins !== null && confEndMins !== null) {
        activeHrWindows = activeHrWindows
          .map((w) => {
            const wStart = timeToMinutes(w.startTime);
            const wEnd = timeToMinutes(w.endTime);
            const s = Math.max(wStart, confStartMins);
            const e = Math.min(wEnd, confEndMins);
            return {
              ...w,
              startTime: minutesToTime(s),
              endTime: minutesToTime(e),
              _valid: s + interviewDurationMinutes <= e,
            };
          })
          .filter((w) => (w as any)._valid);
      }
    }

    // Synthesize fallback windows for active/selected HRs if they have no explicit availability for currentDate
    for (const hr of activeHrAccounts) {
      const hasWindow = activeHrWindows.some((w) => w.hrId === hr.id);
      if (!hasWindow) {
        const s = confStartMins !== null ? confStartMins : timeToMinutes('10:00');
        const e = confEndMins !== null ? confEndMins : timeToMinutes('18:00');
        if (s + interviewDurationMinutes <= e) {
          activeHrWindows.push({
            id: `synth-${hr.id}-${currentDate}`,
            hrId: hr.id,
            hrName: hr.name,
            date: currentDate,
            startTime: minutesToTime(s),
            endTime: minutesToTime(e),
            isAvailable: true,
          });
        }
      }
    }

    // Sort HR windows chronologically from morning to evening
    activeHrWindows.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    // Only proceed if there are active HR windows on this date
    if (activeHrWindows.length === 0) {
      continue;
    }

    const activeHeadWindows = headWindows.filter(
      (w) => w.date === currentDate && w.isAvailable
    );

    // Track busy intervals and consecutive states for currentDate
    const participantBusySchedule = new Map<string, Array<{ start: number; end: number }>>();
    const hrConsecutiveState = new Map<string, { count: number; lastEndTime: number }>();

    for (const hr of activeHrAccounts) {
      participantBusySchedule.set(`HR_${hr.id}`, []);
      hrConsecutiveState.set(hr.id, { count: 0, lastEndTime: -1 });
    }

    for (const head of activeHeadWindows) {
      const key = `HEAD_${head.headName}_${head.headCategory}`;
      if (!participantBusySchedule.has(key)) {
        participantBusySchedule.set(key, []);
      }
    }

    const isIntervalFree = (
      participantKey: string,
      start: number,
      end: number
    ): boolean => {
      const intervals = participantBusySchedule.get(participantKey) || [];
      for (const iv of intervals) {
        if (start < iv.end && end > iv.start) {
          return false;
        }
      }
      return true;
    };

    const markBusy = (participantKey: string, start: number, end: number) => {
      const intervals = participantBusySchedule.get(participantKey) || [];
      intervals.push({ start, end });
      participantBusySchedule.set(participantKey, intervals);
    };

    // Pre-populate busy intervals from existing scheduled slots on currentDate so we NEVER double-book or redo old schedule
    const existingSlotsOnDate = (existingSlots || []).filter(
      (s: any) => s.date === currentDate && s.status !== 'CANCELLED'
    );
    for (const es of existingSlotsOnDate) {
      const esStart = timeToMinutes(es.startTime);
      const esEnd = timeToMinutes(es.endTime);
      if (es.hrId) {
        markBusy(`HR_${es.hrId}`, esStart, esEnd + bufferMinutes);
      }
      if (es.assignedHeadNames && Array.isArray(es.assignedHeadNames)) {
        for (const headName of es.assignedHeadNames) {
          const hw = activeHeadWindows.find((w) => w.headName === headName);
          const cat = hw ? hw.headCategory : 'UNKNOWN';
          markBusy(`HEAD_${headName}_${cat}`, esStart, esEnd + bufferMinutes);
        }
      }
    }

    const stillUnscheduledThisDay: typeof remainingApplicants = [];

    // Schedule candidates into currentDate
    for (const applicant of remainingApplicants) {
      const participantRequirements = getRequiredParticipants(applicant.teams);
      const requiredHeadCats = participantRequirements.requiredHeadCategories;

      let scheduled = false;

      hrLoop: for (const hrWindow of activeHrWindows) {
        const hr = activeHrAccounts.find((h) => h.id === hrWindow.hrId);
        if (!hr) continue;

        const windowStart = timeToMinutes(hrWindow.startTime);
        const windowEnd = timeToMinutes(hrWindow.endTime);
        const hrState = hrConsecutiveState.get(hr.id)!;

        for (
          let cursor = windowStart;
          cursor + interviewDurationMinutes <= windowEnd;
          cursor += bufferMinutes
        ) {
          const slotStart = cursor;
          const slotEnd = slotStart + interviewDurationMinutes;

          // Rule: Priority is ALWAYS for girls before 6 PM (18:00 = 1080m).
          // After 6 PM, slots are strictly for boys (MALE) only.
          const SIX_PM_MINUTES = 18 * 60;
          const applicantGender = getApplicantGender(applicant);

          if (slotEnd > SIX_PM_MINUTES || slotStart >= SIX_PM_MINUTES) {
            // Evening slots past 6 PM are strictly boys only
            if (applicantGender !== 'MALE') {
              continue;
            }
          }

          if (applicantGender === 'FEMALE' && slotEnd > SIX_PM_MINUTES) {
            continue;
          }

          if (!isIntervalFree(`HR_${hr.id}`, slotStart, slotEnd + bufferMinutes)) {
            continue;
          }

          let prospectiveConsecutiveCount = hrState.count;
          if (hrState.lastEndTime > 0) {
            if (slotStart === hrState.lastEndTime + bufferMinutes) {
              prospectiveConsecutiveCount++;
            } else if (slotStart > hrState.lastEndTime + bufferMinutes) {
              prospectiveConsecutiveCount = 1;
            }
          } else {
            prospectiveConsecutiveCount = 1;
          }

          if (prospectiveConsecutiveCount > breakFrequencyInterviews) {
            const breakStart = hrState.lastEndTime;
            const breakEnd = breakStart + breakDurationMinutes;
            if (slotStart < breakEnd) {
              continue;
            } else {
              prospectiveConsecutiveCount = 1;
            }
          }

          // Strictly match available heads on this date and time
          const selectedHeadsForSlot: Array<{ name: string; category: HeadCategory }> = [];
          let allRequiredHeadsAvailable = true;

          for (const reqCat of requiredHeadCats) {
            const eligibleHeadWindows = activeHeadWindows.filter(
              (hw) =>
                hw.headCategory === reqCat &&
                timeToMinutes(hw.startTime) <= slotStart &&
                timeToMinutes(hw.endTime) >= slotEnd
            );

            let foundHead = false;
            for (const headWindow of eligibleHeadWindows) {
              const headKey = `HEAD_${headWindow.headName}_${headWindow.headCategory}`;
              if (isIntervalFree(headKey, slotStart, slotEnd + bufferMinutes)) {
                selectedHeadsForSlot.push({
                  name: headWindow.headName,
                  category: reqCat,
                });
                foundHead = true;
                break;
              }
            }

            if (!foundHead) {
              allRequiredHeadsAvailable = false;
              break;
            }
          }

          if (!allRequiredHeadsAvailable) {
            continue;
          }

          markBusy(`HR_${hr.id}`, slotStart, slotEnd + bufferMinutes);
          for (const h of selectedHeadsForSlot) {
            markBusy(`HEAD_${h.name}_${h.category}`, slotStart, slotEnd + bufferMinutes);
          }

          hrConsecutiveState.set(hr.id, {
            count: prospectiveConsecutiveCount,
            lastEndTime: slotEnd,
          });

          slots.push({
            applicantId: applicant.id,
            applicantName: applicant.fullName,
            applicantEmail: applicant.email || '',
            applicantPhone: applicant.phoneNumber,
            applicantFaculty: applicant.faculty || '',
            applicantNationalId: applicant.nationalId || '',
            applicantGender,
            appliedTeams: applicant.teams.map((t) => t.name),
            hrId: hr.id,
            hrName: hr.name,
            assignedHeads: selectedHeadsForSlot,
            date: currentDate,
            startTime: minutesToTime(slotStart),
            endTime: minutesToTime(slotEnd),
            durationMinutes: interviewDurationMinutes,
            interviewMode: config.interviewMode || 'ONLINE',
            location: config.location || (config.interviewMode === 'OFFLINE' ? 'ECU Campus - Main Building' : undefined),
            meetingLink:
              (config.hrMeetingLinks && config.hrMeetingLinks[hr.id]?.trim()) ||
              config.meetingLink ||
              (config.interviewMode === 'ONLINE' ? 'Google Meet (Link will be sent prior to interview)' : undefined),
          });

          scheduled = true;
          break hrLoop;
        }
      }

      if (!scheduled) {
        stillUnscheduledThisDay.push(applicant);
      }
    }

    remainingApplicants = stillUnscheduledThisDay;
  }

  // Any applicants remaining after all dates are exhausted
  for (const applicant of remainingApplicants) {
    unscheduled.push({
      applicantId: applicant.id,
      applicantName: applicant.fullName,
      appliedTeams: applicant.teams.map((t) => t.name),
      requiredHeadCategories: getRequiredParticipants(applicant.teams).requiredHeadCategories,
      reason: `No available interview slots within the configured date range (${effectiveStartDate} to ${effectiveEndDate}) and time window.`,
    });
  }

  return {
    success: true,
    slots,
    unscheduled,
    totalScheduled: slots.length,
    totalApplicants: applicants.length,
  };
}

/**
 * @brief Validates a manual drag-and-drop or slot edit to prevent invalid schedules.
 * @param slot The modified slot.
 * @param allOtherSlots All other currently scheduled slots.
 * @param hrWindows List of configured HR windows.
 * @param headWindows List of configured Head windows.
 */
export function validateManualSlotChange(
  slot: GeneratedScheduleSlot,
  allOtherSlots: GeneratedScheduleSlot[],
  hrWindows: HRAvailabilityWindow[],
  headWindows: HeadAvailabilityWindow[]
): { isValid: boolean; error?: string } {
  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);

  if (slotEnd <= slotStart) {
    return { isValid: false, error: 'End time must be strictly after start time.' };
  }

  if (slot.hrName?.toLowerCase().includes('amar')) {
    return { isValid: false, error: 'Amar is no longer an active HR member.' };
  }

  // 1. Check HR Availability Window
  const hrWindow = hrWindows.find(
    (w) =>
      w.hrId === slot.hrId &&
      w.date === slot.date &&
      w.isAvailable &&
      timeToMinutes(w.startTime) <= slotStart &&
      timeToMinutes(w.endTime) >= slotEnd
  );

  if (!hrWindow) {
    return {
      isValid: false,
      error: `HR "${slot.hrName}" is not available at ${slot.startTime}–${slot.endTime} on ${slot.date}.`,
    };
  }

  // 2. Check HR Conflict with Other Slots
  for (const other of allOtherSlots) {
    if (other.applicantId === slot.applicantId) continue;
    if (other.date !== slot.date) continue;

    if (other.hrId === slot.hrId) {
      const oStart = timeToMinutes(other.startTime);
      const oEnd = timeToMinutes(other.endTime);
      if (slotStart < oEnd && slotEnd > oStart) {
        return {
          isValid: false,
          error: `HR Conflict: "${slot.hrName}" is already conducting an interview with "${other.applicantName}" at this time.`,
        };
      }
    }
  }

  // 3. Check Head Availability & Conflicts
  for (const head of slot.assignedHeads) {
    const headWindow = headWindows.find(
      (w) =>
        w.headName === head.name &&
        w.date === slot.date &&
        w.isAvailable &&
        timeToMinutes(w.startTime) <= slotStart &&
        timeToMinutes(w.endTime) >= slotEnd
    );

    if (!headWindow) {
      return {
        isValid: false,
        error: `Head "${head.name}" (${head.category}) is not available at ${slot.startTime}–${slot.endTime} on ${slot.date}.`,
      };
    }

    for (const other of allOtherSlots) {
      if (other.applicantId === slot.applicantId) continue;
      if (other.date !== slot.date) continue;

      const otherHasHead = other.assignedHeads.some((h) => h.name === head.name);
      if (otherHasHead) {
        const oStart = timeToMinutes(other.startTime);
        const oEnd = timeToMinutes(other.endTime);
        if (slotStart < oEnd && slotEnd > oStart) {
          return {
            isValid: false,
            error: `Head Conflict: "${head.name}" is already assigned to "${other.applicantName}" at this time.`,
          };
        }
      }
    }
  }

  return { isValid: true };
}
