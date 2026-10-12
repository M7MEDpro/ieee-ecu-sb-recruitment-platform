/**
 * @file schedule/route.ts
 * @brief Interview Schedule Timeline Operations Endpoint.
 * @details Supports retrieval, manual drag-and-drop adjustments with real-time
 *          conflict prevention, and slot removals.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/auth';
import {
  listScheduleSlots,
  updateScheduleSlotManual,
  removeScheduleSlot,
  removeScheduleSlots,
  listHRAvailability,
  listHeadAvailability,
} from '@/lib/db';
import { validateManualSlotChange } from '@/lib/scheduler';

export async function GET() {
  try {
    await requireAuth();
    const slots = await listScheduleSlots();
    return NextResponse.json({ success: true, slots });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (body.action === 'set-status') {
      const { slotId, status } = body;
      if (!slotId || !status) {
        return NextResponse.json({ success: false, error: 'Missing slotId or status.' }, { status: 400 });
      }
      const { setScheduleSlotStatus, listScheduleSlots } = await import('@/lib/db');
      if (user.role !== 'FULL_ADMIN') {
        const allSlots = await listScheduleSlots();
        const target = allSlots.find((s) => s.id === slotId);
        if (target && target.hrId && target.hrId !== user.userId) {
          return NextResponse.json({ success: false, error: 'Unauthorized to modify this interview slot.' }, { status: 403 });
        }
      }
      await setScheduleSlotStatus(slotId, status, user.name);
      return NextResponse.json({ success: true, message: `Slot status updated to ${status}.` });
    }

    // All other scheduling operations require FULL_ADMIN
    if (user.role !== 'FULL_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    if (body.action === 'mark-whatsapp-sent') {
      const { slotId, snapshot } = body;
      if (!slotId || !snapshot) {
        return NextResponse.json({ success: false, error: 'Missing slotId or snapshot.' }, { status: 400 });
      }
      const { markScheduleSlotWhatsAppSent } = await import('@/lib/db');
      await markScheduleSlotWhatsAppSent(slotId, snapshot);
      return NextResponse.json({ success: true, message: 'WhatsApp status updated to SENT.' });
    }

    if (body.action === 'toggle-whatsapp-status') {
      const { slotId, status } = body;
      if (!slotId || !status) {
        return NextResponse.json({ success: false, error: 'Missing slotId or status.' }, { status: 400 });
      }
      const { setScheduleSlotWhatsAppStatus } = await import('@/lib/db');
      await setScheduleSlotWhatsAppStatus(slotId, status);
      return NextResponse.json({ success: true, message: `WhatsApp status updated to ${status}.` });
    }

    if (body.action === 'add-custom-slot') {
      const { slot } = body;
      if (!slot || !slot.applicantId || !slot.date || !slot.startTime || !slot.endTime) {
        return NextResponse.json({ success: false, error: 'Missing required slot properties.' }, { status: 400 });
      }
      const { getSupabase } = await import('@/lib/db');
      const sb = getSupabase();
      const slotId = crypto.randomUUID();
      const now = new Date().toISOString();

      const resolvedHrId = slot.hrId === '494ef8dd-de57-4a50-b524-029ae8a37f53'
        ? 'e803679f-0273-499a-9d47-85ccce7e12e3'
        : (slot.hrId || null);

      if (sb) {
        await sb.from('interview_schedules').insert({
          id: slotId,
          applicant_id: slot.applicantId,
          hr_id: resolvedHrId,
          date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          duration_minutes: slot.durationMinutes || 12,
          status: 'SCHEDULED',
          is_manual_override: true,
          interview_mode: slot.interviewMode || 'ONLINE',
          location: slot.location || '',
          meeting_link: slot.meetingLink || '',
          venue_id: slot.venueId || '',
          whatsapp_status: 'NOT_SENT',
          created_at: now,
          updated_at: now,
        });
      }
      return NextResponse.json({ success: true, slotId, message: 'Custom slot created successfully.' });
    }

    if (body.action === 'update-slot-manual') {
      const { slotId, hrId, startTime, endTime, date, interviewMode, location, meetingLink } = body;
      if (!slotId) {
        return NextResponse.json({ success: false, error: 'Missing slotId.' }, { status: 400 });
      }
      const resolvedHrId = hrId === '494ef8dd-de57-4a50-b524-029ae8a37f53'
        ? 'e803679f-0273-499a-9d47-85ccce7e12e3'
        : hrId;

      await updateScheduleSlotManual(slotId, {
        hrId: resolvedHrId || undefined,
        date,
        startTime,
        endTime,
        interviewMode,
        location,
        meetingLink,
      });
      return NextResponse.json({ success: true, message: 'Slot updated successfully.' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { slotId, updates, forceOverride } = body;

    if (!slotId || !updates) {
      return NextResponse.json({ success: false, error: 'Missing slotId or updates.' }, { status: 400 });
    }

    const allSlots = await listScheduleSlots();
    const targetSlot = allSlots.find((s) => s.id === slotId);
    if (!targetSlot) {
      return NextResponse.json({ success: false, error: 'Slot not found.' }, { status: 404 });
    }

    // Only run conflict validation if not forced and time/date/hr was changed
    if (!forceOverride && (updates.startTime || updates.endTime || updates.date || updates.hrId)) {
      const hrWindows = await listHRAvailability();
      const headWindows = await listHeadAvailability();

      const prospectiveSlot: any = {
        ...targetSlot,
        ...updates,
        assignedHeads: targetSlot.assignedHeadNames?.map((name) => ({ name, category: 'TECH_HEAD' })) || [],
      };

      const validation = validateManualSlotChange(
        prospectiveSlot,
        allSlots as any,
        hrWindows,
        headWindows
      );

      if (!validation.isValid) {
        return NextResponse.json({
          success: false,
          error: validation.error,
          canOverride: true,
        }, { status: 400 });
      }
    }

    await updateScheduleSlotManual(slotId, updates);
    return NextResponse.json({ success: true, message: 'Schedule updated successfully.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');
    const slotIdsParam = searchParams.get('slotIds');

    let bodyIds: string[] = [];
    try {
      const body = await request.json();
      if (Array.isArray(body?.slotIds)) {
        bodyIds = body.slotIds;
      }
    } catch {}

    const allIds = Array.from(
      new Set([
        ...(slotId ? [slotId] : []),
        ...(slotIdsParam ? slotIdsParam.split(',') : []),
        ...bodyIds,
      ])
    ).filter(Boolean);

    if (allIds.length === 0) {
      return NextResponse.json({ success: false, error: 'slotId or slotIds required.' }, { status: 400 });
    }

    if (allIds.length === 1) {
      await removeScheduleSlot(allIds[0]);
    } else {
      await removeScheduleSlots(allIds);
    }
    return NextResponse.json({ success: true, message: `${allIds.length} slot(s) removed from schedule.` });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
