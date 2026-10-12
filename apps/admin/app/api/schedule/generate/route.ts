/**
 * @file schedule/generate/route.ts
 * @brief Automatic Interview Scheduling Engine Execution Endpoint.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import {
  listApplicants,
  listHRAccounts,
  listHRAvailability,
  listHeadAvailability,
  listScheduleSlots,
  saveGeneratedSchedule,
} from '@/lib/db';
import { generateInterviewSchedule } from '@/lib/scheduler';

const generateConfigSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date YYYY-MM-DD required.').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid start date YYYY-MM-DD required.').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid end date YYYY-MM-DD required.').optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Valid start time HH:mm required.').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Valid end time HH:mm required.').optional(),
  interviewDurationMinutes: z.number().int().min(5).max(60).default(12),
  bufferMinutes: z.number().int().min(0).max(30).default(3),
  breakDurationMinutes: z.number().int().min(5).max(60).default(15),
  breakFrequencyInterviews: z.number().int().min(1).max(20).default(6),
  interviewMode: z.enum(['ONLINE', 'OFFLINE']).default('ONLINE'),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  committeeIds: z.array(z.string()).optional(),
  selectedHrIds: z.array(z.string()).optional(),
  hrMeetingLinks: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = generateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const rawConfig = parsed.data;
    const effectiveStartDate = rawConfig.startDate || rawConfig.date || new Date().toISOString().split('T')[0];
    const effectiveEndDate = rawConfig.endDate || effectiveStartDate;
    const config = {
      ...rawConfig,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      date: effectiveStartDate,
      startTime: rawConfig.startTime || '10:00',
      endTime: rawConfig.endTime || '18:00',
    };

    // Load participants, availability, and existing schedule slots
    const [allApplicants, existingSlots, hrAccounts, hrWindows, headWindows] = await Promise.all([
      listApplicants(),
      listScheduleSlots(),
      listHRAccounts(),
      listHRAvailability(),
      listHeadAvailability(),
    ]);

    // Exclude applicants that already have an active scheduled slot or are completed
    const existingScheduledApplicantIds = new Set(
      existingSlots
        .filter((s) => s.status !== 'CANCELLED')
        .map((s) => s.applicantId)
    );

    let eligibleApplicants = allApplicants.filter(
      (a) => a.interviewStatus !== 'COMPLETED' && !existingScheduledApplicantIds.has(a.id)
    );

    // If specific committees are selected, filter applicants who applied to ANY of the chosen committees
    if (config.committeeIds && config.committeeIds.length > 0) {
      const selectedSet = new Set(config.committeeIds.map((c) => c.toLowerCase().trim()));
      eligibleApplicants = eligibleApplicants.filter((a) =>
        (a.teams || []).some(
          (t) => selectedSet.has(t.id?.toLowerCase().trim()) || selectedSet.has(t.name?.toLowerCase().trim())
        )
      );
    }

    // Execute engine respecting existing schedule slots and availability
    const scheduleResult = generateInterviewSchedule(
      eligibleApplicants,
      hrAccounts,
      hrWindows,
      headWindows,
      config,
      existingSlots
    );

    // Save as draft schedule
    if (scheduleResult.slots.length > 0) {
      await saveGeneratedSchedule(
        scheduleResult.slots.map((s) => ({
          applicantId: s.applicantId,
          hrId: s.hrId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          durationMinutes: s.durationMinutes,
          assignedHeads: s.assignedHeads,
          interviewMode: s.interviewMode,
          location: s.location,
          meetingLink: s.meetingLink,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      result: scheduleResult,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
