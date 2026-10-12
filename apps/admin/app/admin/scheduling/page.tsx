'use client';

/**
 * @file scheduling/page.tsx
 * @brief Total Freedom Interactive Interview Timeline & WhatsApp Dispatcher Studio.
 * @details Implements visual timeline lanes, drag/click re-timing, dynamic venue allocation,
 *          auto & manual tools, smart WhatsApp change detection, and 1-click dispatch.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Loader2,
  Users,
  RefreshCw,
  MapPin,
  Globe,
  Plus,
  MessageSquare,
  Send,
  Sliders,
  ChevronRight,
  Filter,
  Check,
  CheckSquare,
  ExternalLink,
  ChevronLeft,
  X,
  AlertCircle,
  Phone,
  UserX,
  Search,
  GraduationCap,
} from 'lucide-react';
import {
  InterviewScheduleSlot,
  TEAMS,
  formatTimeTo12h,
  formatTimeString12h,
} from '@ieee-recruitment/shared';
import {
  getClientCached,
  setClientCached,
  invalidateClientCache,
  isClientCacheFresh,
} from '@/lib/clientCache';
import { SkeletonScheduleSlots } from '@/components/Skeletons';

function SchedulingPageContent() {
  const [slots, setSlots] = useState<InterviewScheduleSlot[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [hrAccounts, setHrAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Timeline Views
  const searchParams = useSearchParams();
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_SENT' | 'SENT' | 'RESCHEDULED' | 'NO_SHOW' | 'COMPLETED'>('ALL');
  const [selectedHR, setSelectedHR] = useState<string>('ALL');

  // Handle URL query params (e.g. from Applicants Directory: ?applicantId=...&name=...)
  useEffect(() => {
    const paramAppId = searchParams.get('applicantId');
    const paramSearch = searchParams.get('search') || searchParams.get('name');
    if (paramSearch) {
      setCandidateSearch(paramSearch);
    }
    if (paramAppId) {
      setManualApplicantId(paramAppId);
      setShowAddSlotModal(true);
      const name = searchParams.get('name');
      if (name) {
        setResultMessage(`Ready to schedule interview slot for candidate: ${name}`);
      }
    }
  }, [searchParams]);

  // Generator & Auto-tools Drawer
  const [showAutoScheduler, setShowAutoScheduler] = useState(false);
  const [genStartDate, setGenStartDate] = useState('2026-09-25');
  const [genEndDate, setGenEndDate] = useState('2026-09-25');
  const [genStartTime, setGenStartTime] = useState('10:00');
  const [genEndTime, setGenEndTime] = useState('18:00');
  const [genDuration, setGenDuration] = useState(12);
  const [genBuffer, setGenBuffer] = useState(3);
  const [genBreakDuration, setGenBreakDuration] = useState(15);
  const [genBreakFrequency, setGenBreakFrequency] = useState(6);
  const [genMode, setGenMode] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [genLocation, setGenLocation] = useState('');
  const [genMeetingLink, setGenMeetingLink] = useState('');
  const [genSelectedHRs, setGenSelectedHRs] = useState<string[]>([]);
  const [genHrMeetingLinks, setGenHrMeetingLinks] = useState<Record<string, string>>({});
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [genSelectedCommittees, setGenSelectedCommittees] = useState<string[]>([]);

  // Mass Selection & Bulk Actions
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());
  const [isDeletingMass, setIsDeletingMass] = useState(false);

  // Manual Add Slot Modal
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [manualApplicantId, setManualApplicantId] = useState('');
  const [manualHRId, setManualHRId] = useState('');
  const [manualDate, setManualDate] = useState('2026-09-25');
  const [manualStart, setManualStart] = useState('10:00');
  const [manualEnd, setManualEnd] = useState('10:15');
  const [manualMode, setManualMode] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [manualVenue, setManualVenue] = useState('');
  const [manualLink, setManualLink] = useState('');
  const [creatingManualSlot, setCreatingManualSlot] = useState(false);

  // Inline Slot Editing
  const [editingSlot, setEditingSlot] = useState<InterviewScheduleSlot | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editMode, setEditMode] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [editLocation, setEditLocation] = useState('');
  const [editMeetingLink, setEditMeetingLink] = useState('');
  const [editHRId, setEditHRId] = useState('');
  const [venues, setVenues] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // WhatsApp Templates State for fully customizable messaging
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);

  // WhatsApp Batch Dispatch Queue Modal
  const [showDispatchQueue, setShowDispatchQueue] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);

  // Notifications
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSlots = async (silent = false) => {
    if (!silent && slots.length === 0) setLoading(true);
    try {
      const [slotsRes, appsRes, hrRes, tmplRes] = await Promise.all([
        fetch('/api/schedule'),
        fetch('/api/applicants'),
        fetch('/api/hr'),
        fetch('/api/whatsapp/templates', { cache: 'no-store' }),
      ]);

      const [slotsData, appsData, hrData, tmplData] = await Promise.all([
        slotsRes.json(),
        appsRes.json(),
        hrRes.json(),
        tmplRes.json(),
      ]);

      if (slotsData.success) {
        setSlots(slotsData.slots);
        setClientCached('schedule_slots', slotsData.slots);
      }
      if (appsData.success && Array.isArray(appsData.applicants)) {
        setApplicants(appsData.applicants);
      }
      if (hrData.success && Array.isArray(hrData.accounts)) {
        const filtered = hrData.accounts.filter((h: any) => !h.name?.toLowerCase().includes('amar'));
        setHrAccounts(filtered);
        setGenSelectedHRs((prev) => (prev.length === 0 ? filtered.map((h: any) => h.id) : prev));
      }
      if (tmplData.success && Array.isArray(tmplData.templates)) {
        setWhatsappTemplates(tmplData.templates);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = getClientCached<InterviewScheduleSlot[]>('schedule_slots');
    if (cached && cached.length > 0) {
      setSlots(cached);
      setLoading(false);
    }
    const isFresh = isClientCacheFresh('schedule_slots', 8000);
    fetchSlots(isFresh);

    // Live background auto-refresh every 8s
    const interval = setInterval(() => {
      fetchSlots(true);
    }, 8000);

    const handleFocus = () => fetchSlots(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Distinct Dates in Timeline
  const distinctDates = useMemo(() => {
    const set = new Set<string>();
    slots.forEach((s) => s.date && set.add(s.date));
    return Array.from(set).sort();
  }, [slots]);

  // Filtered Slots
  const filteredSlots = useMemo(() => {
    return slots
      .filter((s) => {
        if (selectedDate !== 'ALL' && s.date !== selectedDate) return false;
        if (statusFilter === 'NOT_SENT' && s.whatsappStatus === 'SENT') return false;
        if (statusFilter === 'SENT' && s.whatsappStatus !== 'SENT') return false;
        if (statusFilter === 'RESCHEDULED' && s.whatsappStatus !== 'RESCHEDULED_PENDING') return false;
        if (statusFilter === 'NO_SHOW' && s.status !== 'NO_SHOW') return false;
        if (statusFilter === 'COMPLETED') {
          const app = applicants.find((a) => a.id === s.applicantId);
          const isComp = s.status === 'COMPLETED' || s.evaluationStatus === 'COMPLETED' || app?.evaluationStatus === 'COMPLETED';
          if (!isComp) return false;
        }
        if (selectedHR !== 'ALL') {
          if (selectedHR === 'UNASSIGNED') {
            if (s.hrId) return false;
          } else {
            if (s.hrId !== selectedHR && s.hrName !== selectedHR) return false;
          }
        }
        if (candidateSearch.trim()) {
          const q = candidateSearch.toLowerCase();
          const matchName = (s.applicantName || '').toLowerCase().includes(q);
          const matchPhone = (s.applicantPhone || '').includes(q);
          if (!matchName && !matchPhone) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const d = (a.date || '').localeCompare(b.date || '');
        if (d !== 0) return d;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
  }, [slots, applicants, selectedDate, statusFilter, selectedHR, candidateSearch]);

  // Metrics for Dispatcher
  const metrics = useMemo(() => {
    const notSent = slots.filter((s) => !s.whatsappStatus || s.whatsappStatus === 'NOT_SENT').length;
    const rescheduled = slots.filter((s) => s.whatsappStatus === 'RESCHEDULED_PENDING').length;
    const sent = slots.filter((s) => s.whatsappStatus === 'SENT').length;
    const noShow = slots.filter((s) => s.status === 'NO_SHOW').length;
    const completed = slots.filter((s) => {
      const app = applicants.find((a) => a.id === s.applicantId);
      return s.status === 'COMPLETED' || s.evaluationStatus === 'COMPLETED' || app?.evaluationStatus === 'COMPLETED';
    }).length;
    return { total: slots.length, notSent, rescheduled, sent, noShow, completed, actionable: notSent + rescheduled };
  }, [slots, applicants]);

  // Actionable queue for sequential dispatch
  const actionableSlots = useMemo(() => {
    return slots.filter((s) => !s.whatsappStatus || s.whatsappStatus === 'NOT_SENT' || s.whatsappStatus === 'RESCHEDULED_PENDING');
  }, [slots]);

  // Clean Egyptian phone normalizer
  const cleanPhone = (phone?: string) => {
    if (!phone) return '';
    let c = phone.replace(/\D/g, '');
    if (c.startsWith('01')) c = '2' + c;
    else if (c.startsWith('1') && c.length === 10) c = '20' + c;
    else if (!c.startsWith('20') && c.length === 11 && c.startsWith('0')) c = '2' + c;
    return c;
  };

  // WhatsApp Message Composer (Fully Dynamic & Customizable from Studio)
  const composeWhatsAppMessage = (slot: InterviewScheduleSlot) => {
    const isRescheduled = slot.whatsappStatus === 'RESCHEDULED_PENDING';
    const isOffline = slot.interviewMode === 'OFFLINE';
    const templateId = isRescheduled ? 'INTERVIEW_RESCHEDULED' : 'INTERVIEW_INVITATION';
    const customTemplate = whatsappTemplates.find((t) => t.id === templateId)?.template;

    // Detect if template uses Arabic or English
    const isArabic = /[\u0600-\u06FF]/.test(customTemplate || '');

    // 1. Sub-templates from WhatsApp Studio
    const meetingLinkLineFmt =
      whatsappTemplates.find((t) => t.id === 'MEETING_LINK_LINE_FORMAT')?.template ||
      '(Google Meet): {{link}}\nMake sure to have your camera Turned on!';
    const timeFmt = whatsappTemplates.find((t) => t.id === 'TIME_FORMAT')?.template;
    const venueFmt = whatsappTemplates.find((t) => t.id === 'VENUE_FORMAT')?.template;
    const teamsSep = whatsappTemplates.find((t) => t.id === 'TEAMS_SEPARATOR_FORMAT')?.template ?? ' & ';

    // 2. Dynamic Meeting Link Line
    const rawLink = (slot.meetingLink || '').trim();
    let linkLine = '';
    if (!isOffline && rawLink) {
      linkLine = meetingLinkLineFmt.replace(/\{\{\s*link\s*\}\}/gi, rawLink);
    }

    // 3. Time formatting
    const start12h = formatTimeTo12h(slot.startTime);
    const end12h = formatTimeTo12h(slot.endTime);
    let timeText = '';
    if (timeFmt) {
      timeText = timeFmt
        .replace(/\{\{\s*start\s*\}\}/gi, start12h)
        .replace(/\{\{\s*end\s*\}\}/gi, end12h);
    } else {
      timeText = isArabic ? `من ${start12h} حتى ${end12h}` : `${start12h} - ${end12h}`;
    }

    // 4. Date formatting
    let dateFormatted = slot.date;
    try {
      const parts = (slot.date || '').split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) {
          dateFormatted = d.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
      }
    } catch {
      dateFormatted = slot.date;
    }

    // 5. Venue formatting
    const defaultVenue = isOffline ? 'ECU Campus — Main Building' : (isArabic ? 'أونلاين عبر الإنترنت (Google Meet)' : 'Online (Google Meet)');
    const venueText = slot.location?.trim() || venueFmt || defaultVenue;

    // 6. Name parts
    const firstName = slot.applicantName ? slot.applicantName.trim().split(/\s+/)[0] : '';
    const teamsText = (slot.appliedTeams || []).join(teamsSep);

    if (customTemplate) {
      let rendered = customTemplate;

      // Expand custom placeholders (CUSTOM_VAR_*)
      const customVars = whatsappTemplates.filter((t) => t.id.startsWith('CUSTOM_VAR_'));
      for (const cv of customVars) {
        const varKey = cv.id.replace('CUSTOM_VAR_', '').toLowerCase();
        rendered = rendered.replace(new RegExp(`{{\\s*${varKey}\\s*}}`, 'gi'), cv.template || '');
      }

      rendered = rendered
        .replace(/\{\{\s*name\s*\}\}/gi, slot.applicantName)
        .replace(/\{\{\s*(first_name|firstName|first\s*name|الاسم_الاول|الاسم\s*الأول)\s*\}\}/gi, firstName || slot.applicantName)
        .replace(/\{\{\s*teams\s*\}\}/gi, teamsText)
        .replace(/\{\{\s*date\s*\}\}/gi, dateFormatted)
        .replace(/\{\{\s*raw_date\s*\}\}/gi, slot.date)
        .replace(/\{\{\s*time\s*\}\}/gi, timeText)
        .replace(/\{\{\s*start\s*\}\}/gi, start12h)
        .replace(/\{\{\s*end\s*\}\}/gi, end12h)
        .replace(/\{\{\s*venue\s*\}\}/gi, venueText)
        .replace(/\{\{\s*meeting_link_line\s*\}\}/gi, linkLine)
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return formatTimeString12h(rendered);
    }

    if (isRescheduled) {
      return formatTimeString12h(`مرحبا ${slot.applicantName}،
من فرع IEEE بالجامعة الصينية المصرية (IEEE ECU Student Branch).
نود إبلاغك بتعديل موعد المقابلة الشخصية الخاص بك إلى الموعد التالي:

- الموعد الجديد: ${dateFormatted}
- التوقيت: ${timeText}
- المكان: ${venueText}
${linkLine}

نعتذر عن أي تغيير في المواعيد، ونلتقي بك في الموعد المحدد.
فريق الموارد البشرية - IEEE ECU SB`.trim());
    }

    return formatTimeString12h(`مرحبا ${slot.applicantName}،
من فرع IEEE بالجامعة الصينية المصرية (IEEE ECU Student Branch).
بخصوص تقديمك للانضمام إلى: (${teamsText}).

يسعدنا إبلاغك بموعد المقابلة الشخصية (Interview):
- اليوم: ${dateFormatted}
- التوقيت: ${timeText}
- المكان: ${venueText}
${linkLine}

يرجى الحضور قبل الموعد بـ 10 دقائق.
بالتوفيق،
فريق الموارد البشرية - IEEE ECU SB`.trim());
  };

  // Launch WhatsApp Web / Deep Link
  const handleLaunchWhatsApp = async (slot: InterviewScheduleSlot) => {
    const phone = cleanPhone(slot.applicantPhone);
    if (!phone) {
      alert(`Applicant ${slot.applicantName} phone number is missing or invalid.`);
      return;
    }

    const message = composeWhatsAppMessage(slot);
    const encoded = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;

    // Open WhatsApp in new tab
    window.open(url, '_blank');

    // Optimistically mark as SENT in local state
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slot.id
          ? {
              ...s,
              whatsappStatus: 'SENT',
              lastSentDate: s.date,
              lastSentStartTime: s.startTime,
              lastSentEndTime: s.endTime,
              lastSentLocation: s.location,
              lastSentMeetingLink: s.meetingLink,
              lastSentMode: s.interviewMode,
            }
          : s
      )
    );

    // Call server to persist
    try {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-whatsapp-sent',
          slotId: slot.id,
          snapshot: {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            location: slot.location,
            meetingLink: slot.meetingLink,
            interviewMode: slot.interviewMode,
          },
        }),
      });
      invalidateClientCache('schedule_slots');
    } catch (e) {
      console.error(e);
    }
  };

  // Clickable WhatsApp Status Toggle (Sent <-> Not Sent)
  const handleToggleWhatsAppStatus = async (slot: InterviewScheduleSlot) => {
    const newStatus = slot.whatsappStatus === 'SENT' ? 'NOT_SENT' : 'SENT';

    // Optimistically update UI
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, whatsappStatus: newStatus } : s))
    );

    try {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-whatsapp-status',
          slotId: slot.id,
          status: newStatus,
        }),
      });
      invalidateClientCache('schedule_slots');
    } catch (e) {
      console.error('Failed to toggle WhatsApp status:', e);
    }
  };

  // Set slot status (e.g. mark NO_SHOW or reactivate SCHEDULED)
  const handleSetSlotStatus = async (slotId: string, newStatus: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED') => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, status: newStatus } : s))
    );
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-status',
          slotId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update slot status');
      invalidateClientCache('schedule_slots');
      setResultMessage(`Slot status updated to ${newStatus}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating slot status');
      await fetchSlots(true);
    }
  };

  // Dispatch Absent Candidate WhatsApp Follow-Up
  const handleLaunchAbsentWhatsApp = (slot: InterviewScheduleSlot) => {
    const phone = cleanPhone(slot.applicantPhone);
    if (!phone) {
      alert(`Applicant ${slot.applicantName} phone number is missing or invalid.`);
      return;
    }
    const msg = formatTimeString12h(`Hello ${slot.applicantName},
This is the IEEE ECU Student Branch HR committee.
We noticed you were unable to attend your scheduled interview today (${slot.date} at ${formatTimeTo12h(slot.startTime)}).
We hope everything is well with you! If you would like to reschedule your interview, please reply to this message with your available times.
IEEE ECU SB Human Resources Team`.trim());

    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Sequential Dispatch Queue: Next
  const handleDispatchNextInQueue = async () => {
    if (actionableSlots.length === 0) return;
    const current = actionableSlots[queueIndex] || actionableSlots[0];
    await handleLaunchWhatsApp(current);

    if (queueIndex < actionableSlots.length - 1) {
      setQueueIndex((prev) => prev + 1);
    } else {
      setShowDispatchQueue(false);
      setQueueIndex(0);
      setResultMessage('Finished dispatching all queued WhatsApp interview notifications.');
    }
  };

  // Quick time adjusters (+5m, -5m)
  const handleQuickAdjustTime = async (slot: InterviewScheduleSlot, deltaMinutes: number) => {
    const parseMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const formatMins = (total: number) => {
      const h = Math.floor(total / 60) % 24;
      const m = total % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const newStart = formatMins(parseMins(slot.startTime) + deltaMinutes);
    const newEnd = formatMins(parseMins(slot.endTime) + deltaMinutes);

    // Optimistic
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slot.id
          ? {
              ...s,
              startTime: newStart,
              endTime: newEnd,
              whatsappStatus: s.whatsappStatus === 'SENT' ? 'RESCHEDULED_PENDING' : s.whatsappStatus,
            }
          : s
      )
    );

    try {
      await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.id,
          updates: { startTime: newStart, endTime: newEnd },
          forceOverride: true, // Complete freedom
        }),
      });
      invalidateClientCache('schedule_slots');
    } catch (e) {
      console.error(e);
      await fetchSlots(true);
    }
  };

  // Save Inline Slot Edit
  const handleSaveSlotEdit = async () => {
    if (!editingSlot) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: editingSlot.id,
          updates: {
            hrId: editHRId || null,
            startTime: editStartTime,
            endTime: editEndTime,
            interviewMode: editMode,
            location: editMode === 'OFFLINE' ? editLocation : undefined,
            meetingLink: editMode === 'ONLINE' ? editMeetingLink : undefined,
          },
          forceOverride: true, // Complete freedom
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update slot.');

      setEditingSlot(null);
      invalidateClientCache('schedule_slots');
      await fetchSlots(true);
      setResultMessage('Interview slot updated successfully.');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Committee selection helpers for Auto Scheduler
  const toggleCommitteeSelection = (teamId: string) => {
    setGenSelectedCommittees((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const selectAllCommittees = () => {
    setGenSelectedCommittees(TEAMS.map((t) => t.id));
  };

  const selectCategoryCommittees = (category: 'TECH' | 'OPERATIONS' | 'MEDIA') => {
    const ids = TEAMS.filter((t) => t.conceptualCategory === category).map((t) => t.id);
    setGenSelectedCommittees(ids);
  };

  const clearCommitteeSelection = () => {
    setGenSelectedCommittees([]);
  };

  // Run Auto-Scheduler Generator
  const handleRunScheduler = async () => {
    setRunningScheduler(true);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: genStartDate,
          endDate: genEndDate,
          startTime: genStartTime,
          endTime: genEndTime,
          date: genStartDate,
          interviewDurationMinutes: Number(genDuration),
          bufferMinutes: Number(genBuffer),
          breakDurationMinutes: Number(genBreakDuration),
          breakFrequencyInterviews: Number(genBreakFrequency),
          interviewMode: genMode,
          location: genMode === 'OFFLINE' ? genLocation.trim() || undefined : undefined,
          meetingLink: genMode === 'ONLINE' ? genMeetingLink.trim() || undefined : undefined,
          committeeIds: genSelectedCommittees.length > 0 ? genSelectedCommittees : undefined,
          selectedHrIds: genSelectedHRs.length > 0 ? genSelectedHRs : undefined,
          hrMeetingLinks: genHrMeetingLinks,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate schedule.');

      invalidateClientCache('schedule_slots');
      await fetchSlots();
      setShowAutoScheduler(false);
      setResultMessage(`Generated interview timeline successfully (${data.result.totalScheduled} slots).`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setRunningScheduler(false);
    }
  };

  // Mass Selection Handlers
  const toggleSelectSlot = (slotId: string) => {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
  };

  const allFilteredSelected =
    filteredSlots.length > 0 && filteredSlots.every((s) => selectedSlotIds.has(s.id));
  const someFilteredSelected =
    filteredSlots.some((s) => selectedSlotIds.has(s.id)) && !allFilteredSelected;

  const toggleSelectAllFiltered = () => {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredSlots.forEach((s) => next.delete(s.id));
      } else {
        filteredSlots.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const clearAllSelected = () => {
    setSelectedSlotIds(new Set());
  };

  const handleMassDelete = async () => {
    const ids = Array.from(selectedSlotIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${ids.length} selected interview slot${
          ids.length > 1 ? 's' : ''
        }? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeletingMass(true);
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIds: ids }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete selected slots.');
      }

      setSelectedSlotIds(new Set());
      invalidateClientCache('schedule_slots');
      await fetchSlots(true);
      setResultMessage(
        `Successfully deleted ${ids.length} interview slot${ids.length > 1 ? 's' : ''}.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing mass deletion');
    } finally {
      setIsDeletingMass(false);
    }
  };

  // Add Custom Slot Manually
  const handleCreateManualSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingManualSlot(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-custom-slot',
          slot: {
            applicantId: manualApplicantId,
            hrId: manualHRId || undefined,
            date: manualDate,
            startTime: manualStart,
            endTime: manualEnd,
            interviewMode: manualMode,
            location: manualMode === 'OFFLINE' ? manualVenue : undefined,
            meetingLink: manualMode === 'ONLINE' ? manualLink : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create slot.');

      setShowAddSlotModal(false);
      invalidateClientCache('schedule_slots');
      await fetchSlots();
      setResultMessage('Custom interview slot added to timeline successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingManualSlot(false);
    }
  };

  // Remove Slot
  const handleRemoveSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to remove this interview slot from the timeline?')) return;
    try {
      await fetch(`/api/schedule?slotId=${slotId}`, { method: 'DELETE' });
      invalidateClientCache('schedule_slots');
      await fetchSlots(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Header & Metrics Bar */}
      <div className="border-b border-white/10 pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold text-[#00a1c0] tracking-widest uppercase block mb-1">
            Interview Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Interview Timeline <span className="text-[#00a1c0]">Studio.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage interview slots, adjust schedules, allocate rooms, and dispatch notifications via WhatsApp.
          </p>
        </div>

        {/* Top Control Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Auto-Sync (8s)</span>
          </div>

          {/* Add Custom Slot */}
          <button
            onClick={() => setShowAddSlotModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/15 transition flex items-center gap-1.5"
          >
            <Plus size={14} className="text-[#00a1c0]" />
            <span>Add Manual Slot</span>
          </button>

          {/* Auto Scheduler Drawer Trigger */}
          <button
            onClick={() => setShowAutoScheduler((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/15 transition flex items-center gap-1.5"
          >
            <Sliders size={14} className="text-[#00a1c0]" />
            <span>Auto Scheduler</span>
          </button>

          {/* WhatsApp Queue Launcher */}
          <button
            onClick={() => {
              if (metrics.actionable > 0) {
                setQueueIndex(0);
                setShowDispatchQueue(true);
              } else {
                setResultMessage('All interview schedules have already been dispatched. Modifying any slot will automatically queue an update notification.');
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
              metrics.actionable > 0
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white shadow-emerald-500/20'
                : 'bg-white/5 hover:bg-white/10 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {metrics.actionable > 0 ? (
              <>
                <MessageSquare size={14} className="animate-pulse" />
                <span>Dispatch Queue ({metrics.actionable})</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>All Dispatched (0 pending)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {resultMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 text-emerald-200 text-xs flex items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            <span>{resultMessage}</span>
          </div>
          <button onClick={() => setResultMessage(null)} className="text-emerald-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-950/80 border border-red-500/40 rounded-2xl p-4 text-red-200 text-xs flex items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-[#D92525] flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Auto-Scheduler Collapsible Drawer */}
      {showAutoScheduler && (
        <div className="admin-card rounded-3xl p-6 space-y-4 border-[#00a1c0]/40 bg-[#011e3b]/90 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-[#00a1c0]" />
              <h3 className="font-bold text-sm text-white">Automated Schedule Generator</h3>
            </div>
            <button onClick={() => setShowAutoScheduler(false)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Date & Time Scheduling Window */}
          <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Calendar size={15} className="text-[#00a1c0]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Schedule Window (Dates & Daily Hours)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-sky-300 font-semibold flex items-center gap-1.5">
                  <Calendar size={12} className="text-[#00a1c0]" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  value={genStartDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setGenStartDate(newStart);
                    if (genEndDate < newStart) {
                      setGenEndDate(newStart);
                    }
                  }}
                  className="w-full bg-black/50 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sky-300 font-semibold flex items-center gap-1.5">
                  <Calendar size={12} className="text-[#00a1c0]" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  value={genEndDate}
                  min={genStartDate}
                  onChange={(e) => setGenEndDate(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sky-300 font-semibold flex items-center gap-1.5">
                  <Clock size={12} className="text-[#00a1c0]" />
                  <span>Daily Start Time {genStartTime && <span className="text-white/60 font-mono text-[11px]">({formatTimeTo12h(genStartTime)})</span>}</span>
                </label>
                <input
                  type="time"
                  value={genStartTime}
                  onChange={(e) => setGenStartTime(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sky-300 font-semibold flex items-center gap-1.5">
                  <Clock size={12} className="text-[#00a1c0]" />
                  <span>Daily End Time {genEndTime && <span className="text-white/60 font-mono text-[11px]">({formatTimeTo12h(genEndTime)})</span>}</span>
                </label>
                <input
                  type="time"
                  value={genEndTime}
                  onChange={(e) => setGenEndTime(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Cadence & Format Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Duration (min)</label>
              <input
                type="number"
                value={genDuration}
                onChange={(e) => setGenDuration(Number(e.target.value))}
                min={5}
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Buffer (min)</label>
              <input
                type="number"
                value={genBuffer}
                onChange={(e) => setGenBuffer(Number(e.target.value))}
                min={0}
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Break Every (slots)</label>
              <input
                type="number"
                value={genBreakFrequency}
                onChange={(e) => setGenBreakFrequency(Number(e.target.value))}
                min={1}
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Break Duration (min)</label>
              <input
                type="number"
                value={genBreakDuration}
                onChange={(e) => setGenBreakDuration(Number(e.target.value))}
                min={5}
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Format</label>
              <select
                value={genMode}
                onChange={(e) => setGenMode(e.target.value as any)}
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none transition"
              >
                <option value="ONLINE" className="bg-[#011c38]">Online (Google Meet)</option>
                <option value="OFFLINE" className="bg-[#011c38]">In-Person (Campus)</option>
              </select>
            </div>
          </div>

          {/* HR Interviewers Selection & Dedicated Meeting Links */}
          <div className="bg-black/30 p-4 rounded-2xl border border-[#00a1c0]/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div>
                <label className="text-xs text-sky-300 font-bold flex items-center gap-1.5">
                  <Users size={14} className="text-[#00a1c0]" />
                  <span>Participating HR Interviewers ({genSelectedHRs.length}/{hrAccounts.length})</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {genMode === 'ONLINE'
                    ? 'Select the HR members who will interview, and assign a unique Google Meet / Zoom link to each one.'
                    : 'Select the HR members available for campus interviews.'}
                </p>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setGenSelectedHRs(hrAccounts.map((h) => h.id))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setGenSelectedHRs([])}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* List of HRs with per-HR meeting link inputs */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {hrAccounts.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No HR accounts found.</p>
              ) : (
                hrAccounts.map((hr) => {
                  const isSelected = genSelectedHRs.includes(hr.id);
                  return (
                    <div
                      key={hr.id}
                      className={`p-3 rounded-xl border transition ${
                        isSelected
                          ? 'bg-[#00a1c0]/10 border-[#00a1c0]/40'
                          : 'bg-white/5 border-white/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGenSelectedHRs((prev) => [...prev, hr.id]);
                              } else {
                                setGenSelectedHRs((prev) => prev.filter((id) => id !== hr.id));
                              }
                            }}
                            className="rounded border-white/20 text-[#00a1c0] focus:ring-0 w-4 h-4 cursor-pointer"
                          />
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                            {hr.name}
                          </span>
                        </label>
                        {isSelected && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00a1c0]/20 text-[#00a1c0] font-medium">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Online Mode: Dedicated Meeting Link for this specific HR */}
                      {genMode === 'ONLINE' && isSelected && (
                        <div className="mt-2.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-sky-200">
                            <Globe size={12} className="text-[#00a1c0]" />
                            <span>Meeting Link for {hr.name}:</span>
                          </div>
                          <input
                            type="url"
                            value={genHrMeetingLinks[hr.id] || ''}
                            onChange={(e) =>
                              setGenHrMeetingLinks((prev) => ({
                                ...prev,
                                [hr.id]: e.target.value,
                              }))
                            }
                            placeholder={`e.g. https://meet.google.com/... (dedicated for ${hr.name})`}
                            className="w-full bg-black/50 border border-[#00a1c0]/40 focus:border-[#00a1c0] rounded-lg px-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Online Mode: Fallback / General Link + Quick Apply */}
            {genMode === 'ONLINE' && (
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                    <Globe size={12} className="text-slate-400" />
                    <span>Default / Fallback Meeting Link (Optional)</span>
                  </label>
                  {genMeetingLink.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...genHrMeetingLinks };
                        genSelectedHRs.forEach((hrId) => {
                          if (!updated[hrId]?.trim()) {
                            updated[hrId] = genMeetingLink.trim();
                          }
                        });
                        setGenHrMeetingLinks(updated);
                      }}
                      className="text-[10px] text-[#00a1c0] hover:underline"
                    >
                      Fill empty HR links with this
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={genMeetingLink}
                  onChange={(e) => setGenMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij (used if an HR has no dedicated link)"
                  className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>
            )}
          </div>

          {/* Dynamic Campus Location Input for Offline Mode */}
          {genMode === 'OFFLINE' && (
            <div className="bg-black/30 p-3.5 rounded-2xl border border-amber-500/30 space-y-1.5">
              <label className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                <MapPin size={14} className="text-amber-400" />
                <span>Campus Location / Room (Offline)</span>
              </label>
              <input
                type="text"
                value={genLocation}
                onChange={(e) => setGenLocation(e.target.value)}
                placeholder="e.g. ECU Campus — Main Building, Room 204"
                className="w-full bg-black/50 border border-amber-500/40 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-slate-400">
                This venue will be assigned to every generated slot and shown on candidates&apos; WhatsApp interview invitations.
              </p>
            </div>
          )}

          {/* Responsive Committee / Team Filter */}
          <div className="bg-black/30 p-4 rounded-2xl border border-[#00a1c0]/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div>
                <label className="text-xs text-[#00a1c0] font-bold flex items-center gap-1.5">
                  <Filter size={14} className="text-[#00a1c0]" />
                  <span>Filter by Committees (Optional)</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {genSelectedCommittees.length === 0 ? (
                    <span className="text-slate-300">
                      All committees included. Select committees (e.g. Software and PR) to schedule only candidates applying to them.
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium">
                      Filtering for {genSelectedCommittees.length} selected committee{genSelectedCommittees.length > 1 ? 's' : ''} only.
                    </span>
                  )}
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={clearCommitteeSelection}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    genSelectedCommittees.length === 0
                      ? 'bg-[#00a1c0]/20 text-[#00a1c0] border border-[#00a1c0]/40'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  All Committees
                </button>
                <button
                  type="button"
                  onClick={() => selectCategoryCommittees('TECH')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                >
                  Tech Only
                </button>
                <button
                  type="button"
                  onClick={() => selectCategoryCommittees('OPERATIONS')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                >
                  Operations Only
                </button>
                <button
                  type="button"
                  onClick={() => selectCategoryCommittees('MEDIA')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                >
                  Media Only
                </button>
              </div>
            </div>

            {/* Committee Selection Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {TEAMS.map((team) => {
                const isSelected = genSelectedCommittees.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleCommitteeSelection(team.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border select-none ${
                      isSelected
                        ? 'bg-[#00a1c0]/25 text-white border-[#00a1c0] shadow-sm shadow-[#00a1c0]/30'
                        : 'bg-black/40 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: team.color || '#00a1c0' }}
                    />
                    <span>{team.name}</span>
                    {isSelected && (
                      <Check size={13} className="text-[#00a1c0] stroke-[2.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleRunScheduler}
              disabled={runningScheduler}
              className="px-5 py-2.5 rounded-xl bg-[#00a1c0] hover:brightness-110 text-white text-xs font-bold transition flex items-center gap-2 shadow"
            >
              {runningScheduler ? <Loader2 size={15} className="animate-spin" /> : <Play size={14} />}
              <span>Generate Timeline</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar & Date Selector Tabs */}
      <div className="flex flex-col gap-3 bg-black/30 p-3.5 rounded-2xl border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Candidate Search in Timeline */}
          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              placeholder="Search candidate name or phone..."
              className="w-full bg-white/5 border border-white/10 focus:border-[#00a1c0] rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-400 outline-none transition"
            />
            {candidateSearch && (
              <button
                type="button"
                onClick={() => setCandidateSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedDate('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedDate === 'ALL'
                  ? 'bg-[#00a1c0] text-white shadow'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              All Dates ({slots.length})
            </button>
          {distinctDates.map((dateStr) => {
            const count = slots.filter((s) => s.date === dateStr).length;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedDate === dateStr
                    ? 'bg-[#00a1c0] text-white shadow'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Calendar size={12} />
                <span>{dateStr}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('NOT_SENT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              statusFilter === 'NOT_SENT' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Unsent ({metrics.notSent})
          </button>
          <button
            onClick={() => setStatusFilter('RESCHEDULED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              statusFilter === 'RESCHEDULED' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Rescheduled ({metrics.rescheduled})
          </button>
          <button
            onClick={() => setStatusFilter('SENT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              statusFilter === 'SENT' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Sent ({metrics.sent})
          </button>
          <button
            onClick={() => setStatusFilter('NO_SHOW')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              statusFilter === 'NO_SHOW' ? 'bg-red-500/20 text-red-300' : 'text-slate-400 hover:text-red-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Absent ({metrics.noShow})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
              statusFilter === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Completed ({metrics.completed})
          </button>

          {/* HR Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg">
            <Users size={12} className="text-[#00c2e0]" />
            <select
              value={selectedHR}
              onChange={(e) => setSelectedHR(e.target.value)}
              className="bg-transparent text-xs text-slate-300 font-semibold outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#011c38]">All HRs</option>
              <option value="UNASSIGNED" className="bg-[#011c38]">Unassigned</option>
              {hrAccounts.map((hr) => (
                <option key={hr.id} value={hr.id} className="bg-[#011c38]">
                  {hr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mass Selection Toggle Button */}
          <button
            type="button"
            onClick={toggleSelectAllFiltered}
            disabled={filteredSlots.length === 0}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 border ${
              allFilteredSelected
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : selectedSlotIds.size > 0
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
            title="Toggle selection for all filtered slots"
          >
            <CheckSquare size={13} className={allFilteredSelected ? 'text-rose-400' : 'text-slate-400'} />
            <span>
              {allFilteredSelected
                ? `Deselect All (${filteredSlots.length})`
                : selectedSlotIds.size > 0
                ? `Selected (${selectedSlotIds.size})`
                : `Select All (${filteredSlots.length})`}
            </span>
          </button>

          <button
            onClick={() => fetchSlots(false)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition ml-2"
            title="Refresh timeline"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Timeline Slots View */}
      {loading && slots.length === 0 ? (
        <SkeletonScheduleSlots count={5} />
      ) : filteredSlots.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#022344]/50 border border-white/10 text-center space-y-3">
          <Calendar size={36} className="mx-auto text-slate-500" />
          <h3 className="font-bold text-base text-white">No matching interview slots</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Generate an automated schedule or add a manual slot to populate the timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSlots.map((slot) => {
            const isSelected = selectedSlotIds.has(slot.id);
            const isEditing = editingSlot?.id === slot.id;
            const isSent = slot.whatsappStatus === 'SENT';
            const isRescheduled = slot.whatsappStatus === 'RESCHEDULED_PENDING';
            const isOffline = slot.interviewMode === 'OFFLINE';
            const isNoShow = slot.status === 'NO_SHOW';
            const applicant = applicants.find((a) => a.id === slot.applicantId);
            const isCompleted = slot.status === 'COMPLETED' || slot.evaluationStatus === 'COMPLETED' || applicant?.evaluationStatus === 'COMPLETED';

            const genAvg = slot.generalAverage ?? applicant?.generalAverage ?? null;
            const techAvg = slot.techAverage ?? applicant?.techAverage ?? null;
            const nonTechAvg = slot.nonTechAverage ?? applicant?.nonTechAverage ?? null;
            const validScores = [genAvg, techAvg, nonTechAvg].filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
            const overallAvg = slot.totalAverage ?? (validScores.length > 0 ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100 : null);

            return (
              <div
                key={slot.id}
                className={`p-4 rounded-3xl border transition-all ${
                  isSelected
                    ? 'bg-[#1b0d18] border-rose-500/80 ring-2 ring-rose-500/60 shadow-lg shadow-rose-950/40'
                    : isEditing
                    ? 'bg-[#023260] border-[#00a1c0] ring-1 ring-[#00a1c0]'
                    : isNoShow
                    ? 'bg-[#220d11]/85 border-red-900/50 hover:border-red-600/50'
                    : isCompleted
                    ? 'bg-[#032338]/90 border-emerald-500/40 hover:border-emerald-400/60 shadow-lg shadow-emerald-950/20'
                    : isRescheduled
                    ? 'bg-[#2b1016]/80 border-rose-500/40 hover:border-rose-500'
                    : isSent
                    ? 'bg-[#0a232e]/70 border-emerald-500/20'
                    : 'bg-[#022344]/80 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Checkbox + Time & Quick Adjusters & Candidate Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                    {/* Mass Selection Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectSlot(slot.id);
                      }}
                      className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition border ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-400 shadow-sm shadow-rose-600/30'
                          : 'bg-black/40 text-transparent border-white/20 hover:border-white/40 hover:bg-white/5'
                      }`}
                      title={isSelected ? 'Deselect this slot' : 'Select for mass delete'}
                    >
                      <Check size={14} className={isSelected ? 'stroke-[3]' : 'opacity-0'} />
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-center min-w-[125px]">
                        <span className="text-xs font-mono font-bold text-white block whitespace-nowrap">
                          {formatTimeTo12h(slot.startTime)} – {formatTimeTo12h(slot.endTime)}
                        </span>
                        <span className="text-[10px] text-slate-400">{slot.date}</span>
                      </div>

                      {/* Quick +/- 5 mins adjusters for complete freedom */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleQuickAdjustTime(slot, -5)}
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-400 hover:text-white transition font-mono"
                          title="Move 5 minutes earlier"
                        >
                          -5m
                        </button>
                        <button
                          onClick={() => handleQuickAdjustTime(slot, 5)}
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-400 hover:text-white transition font-mono"
                          title="Move 5 minutes later"
                        >
                          +5m
                        </button>
                      </div>
                    </div>

                    {/* Candidate Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{slot.applicantName}</h4>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] shadow-sm">
                            <CheckCircle2 size={11} className="text-emerald-400" />
                            <span>Completed</span>
                          </span>
                        )}
                        {(slot.applicantFaculty || applicants.find((a) => a.id === slot.applicantId)?.faculty) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#00a1c0]/20 border border-[#00a1c0]/40 text-[#00a1c0] font-bold text-[11px] shadow-sm">
                            <GraduationCap size={12} />
                            <span>{slot.applicantFaculty || applicants.find((a) => a.id === slot.applicantId)?.faculty}</span>
                          </span>
                        )}
                        {slot.applicantPhone && (
                          <a
                            href={`tel:${slot.applicantPhone}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-mono font-bold text-xs hover:bg-emerald-500/25 transition shadow-sm"
                            title="Click to call / Copy phone number"
                          >
                            <Phone size={11} className="text-emerald-400" />
                            <span>{slot.applicantPhone}</span>
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {slot.appliedTeams.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#00a1c0]/20 text-[#00a1c0] font-semibold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Venue / Link Tag */}
                      <div className="flex items-center gap-2 mt-1.5">
                        {isOffline ? (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1">
                            <MapPin size={11} className="text-amber-400" />
                            <span>{slot.location || 'ECU Campus - Main Building'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30 flex items-center gap-1">
                            <Globe size={11} className="text-sky-400" />
                            <span>{slot.meetingLink || 'Online (Google Meet)'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Interviewer & Status */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 text-xs w-full lg:w-auto">
                    <div className="space-y-0.5">
                      <div className="text-slate-300">
                        HR: <strong className="text-white">{slot.hrName || 'Not Assigned'}</strong>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Heads: {slot.assignedHeadNames?.join(', ') || 'Auto Pool'}
                      </div>
                    </div>

                    {/* Interactive Clickable WhatsApp Status Pill */}
                    <button
                      type="button"
                      onClick={() => handleToggleWhatsAppStatus(slot)}
                      title="Click to toggle status (Sent ↔ Not Sent)"
                      className="cursor-pointer transition-transform hover:scale-105 active:scale-95 text-left"
                    >
                      {isRescheduled ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[10px] border border-rose-500/30 flex items-center gap-1 animate-pulse">
                          <AlertTriangle size={11} />
                          <span>Rescheduled (Pending)</span>
                        </span>
                      ) : isSent ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 size={11} />
                          <span>Sent via WhatsApp</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] border border-amber-500/30 flex items-center gap-1">
                          <Clock size={11} />
                          <span>Not Sent</span>
                        </span>
                      )}
                    </button>

                    {isCompleted && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] flex items-center gap-1.5 shadow-sm shadow-emerald-950/40">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span>Completed</span>
                      </span>
                    )}

                    {isNoShow && (
                      <span className="px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 font-bold text-[10px] flex items-center gap-1 shadow-sm">
                        <UserX size={11} />
                        <span>Absent</span>
                      </span>
                    )}

                    {/* Average Scores Badge */}
                    {(isCompleted || overallAvg !== null) && (overallAvg !== null || genAvg !== null || techAvg !== null || nonTechAvg !== null) && (
                      <div className="flex items-center gap-2 bg-black/60 border border-emerald-500/35 rounded-xl px-2.5 py-1 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Avg Score:</span>
                          <span className="text-xs font-black text-white bg-emerald-500/30 border border-emerald-400/40 px-2 py-0.5 rounded-lg font-mono">
                            {overallAvg !== null ? `${overallAvg} / 10` : (genAvg !== null ? `${genAvg} / 10` : '—')}
                          </span>
                        </div>
                        {(genAvg !== null || techAvg !== null || nonTechAvg !== null) && (
                          <div className="hidden sm:flex items-center gap-1.5 text-[10px] border-l border-white/10 pl-2">
                            {genAvg !== null && (
                              <span title="General Average" className="text-slate-300">
                                Gen: <strong className="text-white font-mono">{genAvg}</strong>
                              </span>
                            )}
                            {techAvg !== null && (
                              <span title="Tech Average" className="text-[#00a1c0]">
                                Tech: <strong className="text-white font-mono">{techAvg}</strong>
                              </span>
                            )}
                            {nonTechAvg !== null && (
                              <span title="Non-Tech Average" className="text-purple-300">
                                Non-Tech: <strong className="text-white font-mono">{nonTechAvg}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {/* Desktop Action Row (Hidden on mobile, visible on lg+) */}
                  <div className="hidden lg:flex items-center gap-2">
                    {/* Absent / No-Show Quick Actions */}
                    {isNoShow ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSetSlotStatus(slot.id, 'SCHEDULED')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 text-xs font-semibold transition flex items-center gap-1"
                          title="Reactivate slot as Scheduled"
                        >
                          <RefreshCw size={12} />
                          <span>Reactivate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLaunchAbsentWhatsApp(slot)}
                          className="px-2.5 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-700/50 text-xs font-semibold transition flex items-center gap-1.5 shadow"
                          title="Send Absent Follow-up message on WhatsApp"
                        >
                          <MessageSquare size={12} />
                          <span>Absent WA</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetSlotStatus(slot.id, 'NO_SHOW')}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 text-xs font-semibold transition flex items-center gap-1"
                        title="Mark candidate as absent / no-show"
                      >
                        <UserX size={12} />
                        <span>No-Show</span>
                      </button>
                    )}

                    {/* Start Interview Room */}
                    <Link
                      href={`/hr/interview/${slot.applicantId || slot.id}`}
                      className={`px-3 py-1.5 rounded-xl ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-600 to-[#00a1c0] hover:brightness-110 text-white'
                          : 'bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 text-white'
                      } text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-[#00a1c0]/20`}
                      title={isCompleted ? 'Review or edit completed evaluation' : 'Launch live interview room'}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-300" />
                          <span>Review Interview</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} className="fill-current text-white" />
                          <span>Start Interview</span>
                        </>
                      )}
                    </Link>

                    {/* Applicant Details */}
                    <Link
                      href={`/admin/applicants/${slot.applicantId}`}
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 text-xs font-bold transition flex items-center gap-1.5"
                      title="View applicant full profile"
                    >
                      <ExternalLink size={12} className="text-[#00a1c0]" />
                      <span>Details</span>
                    </Link>

                    {/* 1-Click WhatsApp Button */}
                    <button
                      onClick={() => handleLaunchWhatsApp(slot)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow ${
                        isRescheduled
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                          : isSent
                          ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                      }`}
                      title="Open WhatsApp chat with pre-filled message"
                    >
                      <MessageSquare size={14} />
                      <span>{isRescheduled ? 'Send Reschedule' : isSent ? 'Reopen' : 'WhatsApp'}</span>
                    </button>

                    {/* Edit Time / Location */}
                    <button
                      onClick={() => {
                        setEditingSlot(slot);
                        setEditStartTime(slot.startTime);
                        setEditEndTime(slot.endTime);
                        setEditMode(slot.interviewMode || 'ONLINE');
                        setEditLocation(slot.location || '');
                        setEditMeetingLink(slot.meetingLink || '');
                        fetch('/api/whatsapp/venues', { cache: 'no-store' })
                          .then((r) => r.json())
                          .then((d) => d.success && Array.isArray(d.venues) && setVenues(d.venues))
                          .catch(() => {});
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                      title="Edit slot and venue"
                    >
                      <Edit2 size={14} />
                    </button>

                    {/* Delete Slot */}
                    <button
                      onClick={() => handleRemoveSlot(slot.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                      title="Remove from timeline"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Mobile Action Rows (Visible on < lg) */}
                  <div className="flex lg:hidden flex-col gap-2 w-full pt-3 border-t border-white/5">
                    {/* Row 1: High-Priority Primary Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/hr/interview/${slot.applicantId || slot.id}`}
                        className={`flex-1 py-2.5 px-3 rounded-xl ${
                          isCompleted
                            ? 'bg-gradient-to-r from-emerald-600 to-[#00a1c0] hover:brightness-110 text-white'
                            : 'bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 text-white'
                        } text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-[#00a1c0]/20 text-center`}
                        title={isCompleted ? 'Review or edit completed evaluation' : 'Launch live interview room'}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 size={12} className="text-emerald-300" />
                            <span>Review Interview</span>
                          </>
                        ) : (
                          <>
                            <Play size={12} className="fill-current text-white" />
                            <span>Start Interview</span>
                          </>
                        )}
                      </Link>

                      <button
                        onClick={() => handleLaunchWhatsApp(slot)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow text-center ${
                          isRescheduled
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                            : isSent
                            ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                        }`}
                        title="Open WhatsApp chat with pre-filled message"
                      >
                        <MessageSquare size={14} />
                        <span>{isRescheduled ? 'Reschedule' : isSent ? 'Reopen WA' : 'WhatsApp'}</span>
                      </button>
                    </div>

                    {/* Row 2: Secondary Tools & Controls */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/applicants/${slot.applicantId}`}
                        target="_blank"
                        className="flex-1 py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 text-xs font-bold transition flex items-center justify-center gap-1.5 text-center"
                        title="View applicant full profile"
                      >
                        <ExternalLink size={12} className="text-[#00a1c0]" />
                        <span>Details</span>
                      </Link>

                      {isNoShow ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSetSlotStatus(slot.id, 'SCHEDULED')}
                            className="flex-1 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 text-xs font-semibold transition flex items-center justify-center gap-1"
                            title="Reactivate slot as Scheduled"
                          >
                            <RefreshCw size={12} />
                            <span>Reactivate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchAbsentWhatsApp(slot)}
                            className="flex-1 py-2 px-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-700/50 text-xs font-semibold transition flex items-center justify-center gap-1 shadow"
                            title="Send Absent Follow-up message on WhatsApp"
                          >
                            <MessageSquare size={12} />
                            <span>Absent WA</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetSlotStatus(slot.id, 'NO_SHOW')}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 text-xs font-semibold transition flex items-center justify-center gap-1"
                          title="Mark candidate as absent / no-show"
                        >
                          <UserX size={12} />
                          <span>No-Show</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingSlot(slot);
                          setEditStartTime(slot.startTime);
                          setEditEndTime(slot.endTime);
                          setEditMode(slot.interviewMode || 'ONLINE');
                          setEditLocation(slot.location || '');
                          setEditMeetingLink(slot.meetingLink || '');
                          setEditHRId(slot.hrId || '');
                          fetch('/api/whatsapp/venues', { cache: 'no-store' })
                            .then((r) => r.json())
                            .then((d) => d.success && Array.isArray(d.venues) && setVenues(d.venues))
                            .catch(() => {});
                        }}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition shrink-0"
                        title="Edit slot and venue"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition shrink-0"
                        title="Remove from timeline"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Editing Form */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-300">From:</label>
                        <input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="bg-black/50 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                        />
                        {editStartTime && (
                          <span className="text-[11px] font-mono font-bold text-sky-400">({formatTimeTo12h(editStartTime)})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-300">To:</label>
                        <input
                          type="time"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="bg-black/50 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                        />
                        {editEndTime && (
                          <span className="text-[11px] font-mono font-bold text-sky-400">({formatTimeTo12h(editEndTime)})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setEditMode('ONLINE')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            editMode === 'ONLINE' ? 'bg-[#00a1c0] text-white shadow' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Globe size={12} /> Online
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditMode('OFFLINE')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            editMode === 'OFFLINE' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <MapPin size={12} /> Offline
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-300 font-medium whitespace-nowrap">HR:</label>
                        <select
                          value={editHRId}
                          onChange={(e) => setEditHRId(e.target.value)}
                          className="bg-black/50 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                        >
                          <option value="" className="bg-[#011c38]">Unassigned (Auto Pool)</option>
                          {hrAccounts.map((hr) => (
                            <option key={hr.id} value={hr.id} className="bg-[#011c38]">
                              {hr.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {editMode === 'OFFLINE' ? (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-amber-300 flex-shrink-0 font-medium">Venue / Room:</label>
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="e.g. ECU Campus — Building B, Room 204"
                          className="w-full bg-black/50 border border-amber-500/40 focus:border-amber-400 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-sky-300 flex-shrink-0 font-medium">Meeting Link:</label>
                        <input
                          type="text"
                          value={editMeetingLink}
                          onChange={(e) => setEditMeetingLink(e.target.value)}
                          placeholder="e.g. meet.google.com/abc-defg-hij"
                          className="w-full bg-black/50 border border-sky-500/40 focus:border-[#00a1c0] rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingSlot(null)}
                        className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSlotEdit}
                        disabled={savingEdit}
                        className="px-4 py-1.5 rounded-lg bg-[#00a1c0] hover:brightness-110 text-white text-xs font-bold transition flex items-center gap-1"
                      >
                        {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <SaveIcon />}
                        <span>Save & Update Slot</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: BATCH WHATSAPP DISPATCH QUEUE */}
      {showDispatchQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg admin-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 border-[#00a1c0]/40 shadow-2xl bg-[#011a33] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-emerald-400" />
                <h3 className="font-bold text-base text-white">WhatsApp Dispatch Queue</h3>
              </div>
              <button onClick={() => setShowDispatchQueue(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Opens candidate WhatsApp chat with the pre-filled message. Press <strong>Enter</strong> in WhatsApp to dispatch!
              </p>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span>Queue Progress:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {queueIndex + 1} / {actionableSlots.length}
                </span>
              </div>
            </div>

            {actionableSlots[queueIndex] && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="font-bold text-white text-sm">
                  Current Candidate: {actionableSlots[queueIndex].applicantName}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>Time: {formatTimeTo12h(actionableSlots[queueIndex].startTime)} – {formatTimeTo12h(actionableSlots[queueIndex].endTime)}</span>
                  <span>Date: {actionableSlots[queueIndex].date}</span>
                </div>
                <div className="text-[11px] text-[#00a1c0] font-mono">
                  Phone: {actionableSlots[queueIndex].applicantPhone || 'No Phone'}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setShowDispatchQueue(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Close Queue
              </button>

              <button
                type="button"
                onClick={handleDispatchNextInQueue}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <span>Open WhatsApp & Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL ADD SLOT FOR ANY APPLICANT */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateManualSlot}
            className="w-full max-w-lg admin-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 border-white/10 bg-[#011a33] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-[#00a1c0]" />
                <h3 className="font-bold text-base text-white">Add Manual Interview Slot</h3>
              </div>
              <button onClick={() => setShowAddSlotModal(false)} type="button" className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Select Candidate</label>
              <select
                required
                value={manualApplicantId}
                onChange={(e) => setManualApplicantId(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="">Select candidate...</option>
                {applicants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName} — {a.phoneNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Date</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">From {manualStart && <span className="text-sky-400 font-normal font-mono">({formatTimeTo12h(manualStart)})</span>}</label>
                <input
                  type="time"
                  required
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">To {manualEnd && <span className="text-sky-400 font-normal font-mono">({formatTimeTo12h(manualEnd)})</span>}</label>
                <input
                  type="time"
                  required
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Assigned HR (Optional)</label>
              <select
                value={manualHRId}
                onChange={(e) => setManualHRId(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="">Unassigned (Auto Pool)</option>
                {hrAccounts.map((hr) => (
                  <option key={hr.id} value={hr.id}>
                    {hr.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Interview Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setManualMode('ONLINE')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    manualMode === 'ONLINE'
                      ? 'bg-[#00a1c0]/20 text-[#00a1c0] border-[#00a1c0]'
                      : 'bg-black/30 text-slate-400 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <Globe size={14} /> Online (Google Meet)
                </button>
                <button
                  type="button"
                  onClick={() => setManualMode('OFFLINE')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    manualMode === 'OFFLINE'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                      : 'bg-black/30 text-slate-400 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <MapPin size={14} /> In-Person (Campus)
                </button>
              </div>
            </div>

            {/* Dynamic Link or Venue Input */}
            {manualMode === 'ONLINE' ? (
              <div className="space-y-1 bg-black/20 p-3 rounded-2xl border border-[#00a1c0]/30">
                <label className="text-xs text-sky-300 font-semibold flex items-center gap-1.5">
                  <Globe size={13} className="text-[#00a1c0]" />
                  <span>Google Meet / Zoom Meeting Link</span>
                </label>
                <input
                  type="url"
                  value={manualLink}
                  onChange={(e) => setManualLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full bg-black/40 border border-[#00a1c0]/40 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            ) : (
              <div className="space-y-1 bg-black/20 p-3 rounded-2xl border border-amber-500/30">
                <label className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                  <MapPin size={13} className="text-amber-400" />
                  <span>Campus Location / Room</span>
                </label>
                <input
                  type="text"
                  value={manualVenue}
                  onChange={(e) => setManualVenue(e.target.value)}
                  placeholder="e.g. ECU Campus — Main Building, Room 204"
                  className="w-full bg-black/40 border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddSlotModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingManualSlot}
                className="px-5 py-2.5 rounded-xl bg-[#00a1c0] hover:brightness-110 text-white text-xs font-bold transition"
              >
                {creatingManualSlot ? 'Adding Slot...' : 'Add Slot to Timeline'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sticky Floating Mass Action Bar */}
      {selectedSlotIds.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-[#011e3b]/95 backdrop-blur-md border border-rose-500/50 rounded-2xl shadow-2xl p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <CheckSquare size={18} className="text-rose-400" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {selectedSlotIds.size} Slot{selectedSlotIds.size > 1 ? 's' : ''} Selected
                </h4>
                <p className="text-[11px] text-slate-400">
                  Mass action operations for selected interview slots
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={clearAllSelected}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-semibold transition"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={handleMassDelete}
                disabled={isDeletingMass}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40"
              >
                {isDeletingMass ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>Delete Selected ({selectedSlotIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIcon() {
  return <Check size={12} />;
}

export default function SchedulingPage() {
  return (
    <React.Suspense fallback={<SkeletonScheduleSlots />}>
      <SchedulingPageContent />
    </React.Suspense>
  );
}
