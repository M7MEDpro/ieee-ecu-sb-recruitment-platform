'use client';

/**
 * @file whatsapp/page.tsx
 * @brief Unified WhatsApp Communication & Group Links Studio.
 * @details Governs hierarchical group links, custom WhatsApp message templates,
 *          decision body customization, links section formatting, and dynamic venues pool.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  MessageSquare,
  Link as LinkIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Smartphone,
  Cpu,
  Palette,
  Layers,
  MapPin,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Settings2,
  Eye,
  Check,
} from 'lucide-react';
import {
  WhatsAppGroupLinks,
  WhatsAppTemplate,
  TEAMS,
} from '@ieee-recruitment/shared';

// Standard cross-platform safe default sub-templates
const DEFAULT_DECISION_ACCEPTED =
  'يسعدنا إبلاغك بقبولك رسمياً في لجنة: *{{accepted_teams}}*. نرحب بك في فريق العمل.';

const DEFAULT_DECISION_PARTIAL =
  'يسعدنا إبلاغك بقبولك رسمياً في لجنة: *{{accepted_teams}}*.\nونعتذر عن عدم إمكانية القبول في لجنة: *{{rejected_teams}}* نظراً لمحدودية الأماكن المتاحة.';

const DEFAULT_DECISION_REJECTED =
  'نشكرك على اهتمامك ووقتك في التقديم والمقابلة معنا.\nنعتذر عن عدم إمكانية قبولك في هذه المرحلة نظراً لمحدودية المقاعد المتاحة والمنافسة الشديدة.\nنتمنى لك كل التوفيق والنجاح في خطواتك القادمة.';

const DEFAULT_LINKS_HEADER = 'يرجى الانضمام للمجموعات التالية لمتابعة المستجدات والتواصل:';
const DEFAULT_LINKS_FAMILY = '- مجموعة العائلة العامة: {{link}}';
const DEFAULT_LINKS_TECH = '- ميجا جروب اللجان التقنية (Tech): {{link}}';
const DEFAULT_LINKS_MEDIA = '- ميجا جروب لجان الميديا والتصميم (Media): {{link}}';
const DEFAULT_LINKS_COMMITTEE = '- جروب لجنة {{committee}}: {{link}}';

const DEFAULT_MEETING_LINK_FORMAT = '- رابط المقابلة (Google Meet): {{link}}';
const DEFAULT_VENUE_FORMAT = 'ECU Campus — Main Building';
const DEFAULT_TIME_FORMAT = 'من {{start}} حتى {{end}}';
const DEFAULT_TEAMS_SEPARATOR = ' & ';

export default function WhatsAppStudioPage() {
  const [activeTab, setActiveTab] = useState<'LINKS' | 'TEMPLATES'>('LINKS');

  // Group Links State
  const [links, setLinks] = useState<WhatsAppGroupLinks>({
    familyLink: '',
    techMegaLink: '',
    mediaMegaLink: '',
    teamLinks: {},
  });
  const [savingLinks, setSavingLinks] = useState(false);
  const [linksMsg, setLinksMsg] = useState<string | null>(null);

  // Templates State
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('COMBINED_DECISION');
  const [templateMap, setTemplateMap] = useState<Record<string, string>>({
    COMBINED_DECISION: '',
    INTERVIEW_INVITATION: '',
    INTERVIEW_RESCHEDULED: '',
  });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);

  // Customization sub-templates state
  const [decisionAccepted, setDecisionAccepted] = useState(DEFAULT_DECISION_ACCEPTED);
  const [decisionPartial, setDecisionPartial] = useState(DEFAULT_DECISION_PARTIAL);
  const [decisionRejected, setDecisionRejected] = useState(DEFAULT_DECISION_REJECTED);

  const [linksHeader, setLinksHeader] = useState(DEFAULT_LINKS_HEADER);
  const [linksFamilyFormat, setLinksFamilyFormat] = useState(DEFAULT_LINKS_FAMILY);
  const [linksTechFormat, setLinksTechFormat] = useState(DEFAULT_LINKS_TECH);
  const [linksMediaFormat, setLinksMediaFormat] = useState(DEFAULT_LINKS_MEDIA);
  const [linksCommitteeFormat, setLinksCommitteeFormat] = useState(DEFAULT_LINKS_COMMITTEE);

  const [meetingLinkFormat, setMeetingLinkFormat] = useState(DEFAULT_MEETING_LINK_FORMAT);
  const [venueFormat, setVenueFormat] = useState(DEFAULT_VENUE_FORMAT);
  const [timeFormat, setTimeFormat] = useState(DEFAULT_TIME_FORMAT);
  const [teamsFormat, setTeamsFormat] = useState(DEFAULT_TEAMS_SEPARATOR);
  const [customVars, setCustomVars] = useState<Array<{ key: string; value: string }>>([]);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [activePlaceholderCategory, setActivePlaceholderCategory] = useState<
    'DECISION' | 'LINKS' | 'MEETING' | 'VENUE' | 'TIME' | 'CUSTOM'
  >('DECISION');

  // Preview State (for combined decision: Full Acceptance, Partial, Rejection)
  const [previewMode, setPreviewMode] = useState<'FULL_ACCEPT' | 'PARTIAL_ACCEPT' | 'REJECTED'>('PARTIAL_ACCEPT');

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [linksRes, tmplRes] = await Promise.all([
        fetch('/api/whatsapp/links'),
        fetch('/api/whatsapp/templates'),
      ]);

      const linksData = await linksRes.json();
      const tmplData = await tmplRes.json();

      if (linksData.success && linksData.links) {
        setLinks(linksData.links);
      }
      if (tmplData.success && Array.isArray(tmplData.templates)) {
        setTemplates(tmplData.templates);

        // Load main templates and sub-templates into maps
        const mainMap: Record<string, string> = {};
        const subMap: Record<string, string> = {};
        const loadedCustomVars: Array<{ key: string; value: string }> = [];

        for (const t of tmplData.templates) {
          subMap[t.id] = t.template;
          if (['COMBINED_DECISION', 'INTERVIEW_INVITATION', 'INTERVIEW_RESCHEDULED'].includes(t.id)) {
            mainMap[t.id] = t.template;
          } else if (t.id.startsWith('CUSTOM_VAR_')) {
            const varKey = t.id.replace('CUSTOM_VAR_', '').toLowerCase();
            loadedCustomVars.push({ key: varKey, value: t.template });
          }
        }

        setTemplateMap((prev) => ({ ...prev, ...mainMap }));

        if (subMap['DECISION_BODY_ACCEPTED']) setDecisionAccepted(subMap['DECISION_BODY_ACCEPTED']);
        if (subMap['DECISION_BODY_PARTIAL']) setDecisionPartial(subMap['DECISION_BODY_PARTIAL']);
        if (subMap['DECISION_BODY_REJECTED']) setDecisionRejected(subMap['DECISION_BODY_REJECTED']);

        if (subMap['LINKS_HEADER']) setLinksHeader(subMap['LINKS_HEADER']);
        if (subMap['LINKS_FAMILY_FORMAT']) setLinksFamilyFormat(subMap['LINKS_FAMILY_FORMAT']);
        if (subMap['LINKS_TECH_FORMAT']) setLinksTechFormat(subMap['LINKS_TECH_FORMAT']);
        if (subMap['LINKS_MEDIA_FORMAT']) setLinksMediaFormat(subMap['LINKS_MEDIA_FORMAT']);
        if (subMap['LINKS_COMMITTEE_FORMAT']) setLinksCommitteeFormat(subMap['LINKS_COMMITTEE_FORMAT']);

        if (subMap['MEETING_LINK_LINE_FORMAT']) setMeetingLinkFormat(subMap['MEETING_LINK_LINE_FORMAT']);
        if (subMap['VENUE_FORMAT']) setVenueFormat(subMap['VENUE_FORMAT']);
        if (subMap['TIME_FORMAT']) setTimeFormat(subMap['TIME_FORMAT']);
        if (subMap['TEAMS_SEPARATOR_FORMAT']) setTeamsFormat(subMap['TEAMS_SEPARATOR_FORMAT']);
        if (loadedCustomVars.length > 0) setCustomVars(loadedCustomVars);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLinks(true);
    setLinksMsg(null);
    try {
      const res = await fetch('/api/whatsapp/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links }),
      });
      const data = await res.json();
      if (data.success) {
        setLinksMsg('تم حفظ وتحديث روابط مجموعات الواتساب بنجاح.');
      } else {
        throw new Error(data.error || 'Failed to save links.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLinks(false);
    }
  };

  const handleSelectTemplateTab = (id: string) => {
    setSelectedTemplateId(id);
    setTemplateMsg(null);
  };

  const handleAddCustomPlaceholder = () => {
    const cleanKey = newVarKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanKey) {
      alert('Please enter a valid variable name (letters, numbers, underscores).');
      return;
    }
    if (
      ['name', 'first_name', 'firstname', 'teams', 'date', 'time', 'venue', 'meeting_link_line', 'decision_body', 'links_section', 'accepted_teams', 'rejected_teams', 'applied_teams'].includes(cleanKey) ||
      customVars.some((v) => v.key === cleanKey)
    ) {
      alert(`Placeholder {{${cleanKey}}} already exists.`);
      return;
    }
    setCustomVars((prev) => [...prev, { key: cleanKey, value: newVarValue.trim() }]);
    setNewVarKey('');
    setNewVarValue('');
  };

  const handleDeleteCustomPlaceholder = (key: string) => {
    setCustomVars((prev) => prev.filter((v) => v.key !== key));
  };

  const handleUpdateCustomPlaceholderValue = (key: string, value: string) => {
    setCustomVars((prev) =>
      prev.map((v) => (v.key === key ? { ...v, value } : v))
    );
  };

  const handleSaveAllTemplates = async () => {
    setSavingTemplate(true);
    setTemplateMsg(null);
    try {
      const updatedList: WhatsAppTemplate[] = [
        {
          id: 'COMBINED_DECISION' as any,
          title: 'Combined Decision / القرار المجمع (قبول / رفض)',
          template: templateMap['COMBINED_DECISION'] || '',
        },
        {
          id: 'INTERVIEW_INVITATION' as any,
          title: 'Interview Invitation / دعوة المقابلة الشخصية',
          template: templateMap['INTERVIEW_INVITATION'] || '',
        },
        {
          id: 'INTERVIEW_RESCHEDULED' as any,
          title: 'Rescheduled Notice / تعديل وتأجيل موعد المقابلة',
          template: templateMap['INTERVIEW_RESCHEDULED'] || '',
        },
        {
          id: 'DECISION_BODY_ACCEPTED' as any,
          title: 'Decision Body: Full Acceptance',
          template: decisionAccepted,
        },
        {
          id: 'DECISION_BODY_PARTIAL' as any,
          title: 'Decision Body: Partial Acceptance',
          template: decisionPartial,
        },
        {
          id: 'DECISION_BODY_REJECTED' as any,
          title: 'Decision Body: Rejection',
          template: decisionRejected,
        },
        {
          id: 'LINKS_HEADER' as any,
          title: 'Links Section: Header Text',
          template: linksHeader,
        },
        {
          id: 'LINKS_FAMILY_FORMAT' as any,
          title: 'Links Section: Family Group Line Format',
          template: linksFamilyFormat,
        },
        {
          id: 'LINKS_TECH_FORMAT' as any,
          title: 'Links Section: Tech Mega Group Line Format',
          template: linksTechFormat,
        },
        {
          id: 'LINKS_MEDIA_FORMAT' as any,
          title: 'Links Section: Media Mega Group Line Format',
          template: linksMediaFormat,
        },
        {
          id: 'LINKS_COMMITTEE_FORMAT' as any,
          title: 'Links Section: Committee Group Line Format',
          template: linksCommitteeFormat,
        },
        {
          id: 'MEETING_LINK_LINE_FORMAT' as any,
          title: 'Meeting Link Line Format',
          template: meetingLinkFormat,
        },
        {
          id: 'VENUE_FORMAT' as any,
          title: 'Default Venue Format',
          template: venueFormat,
        },
        {
          id: 'TIME_FORMAT' as any,
          title: 'Time Format',
          template: timeFormat,
        },
        {
          id: 'TEAMS_SEPARATOR_FORMAT' as any,
          title: 'Teams Separator Format',
          template: teamsFormat,
        },
        ...customVars.map((cv) => ({
          id: `CUSTOM_VAR_${cv.key.toUpperCase()}` as any,
          title: `Custom Placeholder: {{${cv.key}}}`,
          template: cv.value,
        })),
      ];

      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: updatedList }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(updatedList);
        setTemplateMsg('Templates and placeholder customizations saved successfully.');
        setTimeout(() => setTemplateMsg(null), 5000);
      } else {
        throw new Error(data.error || 'Failed to save templates.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Dynamic Live Preview Generator with accurate RTL
  const previewText = useMemo(() => {
    let raw = templateMap[selectedTemplateId] || '';

    // Apply custom vars
    for (const cv of customVars) {
      raw = raw.replace(new RegExp(`{{\\s*${cv.key}\\s*}}`, 'gi'), cv.value);
    }

    if (selectedTemplateId === 'INTERVIEW_INVITATION' || selectedTemplateId === 'INTERVIEW_RESCHEDULED') {
      const isAr = /[\u0600-\u06FF]/.test(raw);
      const linkLine = meetingLinkFormat.replace(/\{\{\s*link\s*\}\}/gi, 'meet.google.com/ecu-tech');
      return raw
        .replace(/\{\{\s*name\s*\}\}/gi, isAr ? 'محمد أحمد' : 'Mohamed Ahmed')
        .replace(/\{\{\s*(first_name|firstName|first\s*name|الاسم_الاول|الاسم\s*الأول)\s*\}\}/gi, isAr ? 'محمد' : 'Mohamed')
        .replace(/\{\{\s*teams\s*\}\}/gi, `Software${teamsFormat}PR & Logistics`)
        .replace(/\{\{\s*date\s*\}\}/gi, isAr ? 'السبت 26 سبتمبر 2026' : 'Saturday, September 26, 2026')
        .replace(/\{\{\s*raw_date\s*\}\}/gi, '2026-09-26')
        .replace(/\{\{\s*time\s*\}\}/gi, timeFormat.replace(/\{\{\s*start\s*\}\}/gi, '11:15 AM').replace(/\{\{\s*end\s*\}\}/gi, '11:30 AM'))
        .replace(/\{\{\s*venue\s*\}\}/gi, venueFormat)
        .replace(/\{\{\s*meeting_link_line\s*\}\}/gi, linkLine);
    }

    // COMBINED DECISION PREVIEW
    let computedDecisionBody = '';
    let computedLinksSection = '';

    const familyUrl = links.familyLink || 'https://chat.whatsapp.com/IEEE-ECU-Family-2026';
    const techUrl = links.techMegaLink || 'https://chat.whatsapp.com/IEEE-ECU-Tech-Mega-2026';
    const mediaUrl = links.mediaMegaLink || 'https://chat.whatsapp.com/IEEE-ECU-Media-Mega-2026';
    const softwareUrl = links.teamLinks?.['software'] || 'https://chat.whatsapp.com/IEEE-ECU-Software-Team';

    if (previewMode === 'FULL_ACCEPT') {
      computedDecisionBody = decisionAccepted.replace(/\{\{\s*accepted_teams\s*\}\}/gi, 'Software');

      const linksItems = [
        linksFamilyFormat.replace(/\{\{\s*link\s*\}\}/gi, familyUrl),
        linksTechFormat.replace(/\{\{\s*link\s*\}\}/gi, techUrl),
        linksCommitteeFormat
          .replace(/\{\{\s*team\s*\}\}/gi, 'Software')
          .replace(/\{\{\s*link\s*\}\}/gi, softwareUrl),
      ];
      computedLinksSection = `${linksHeader}\n\n${linksItems.join('\n\n')}`;
    } else if (previewMode === 'PARTIAL_ACCEPT') {
      computedDecisionBody = decisionPartial
        .replace(/\{\{\s*accepted_teams\s*\}\}/gi, 'Software')
        .replace(/\{\{\s*rejected_teams\s*\}\}/gi, 'PR & Logistics');

      const linksItems = [
        linksFamilyFormat.replace(/\{\{\s*link\s*\}\}/gi, familyUrl),
        linksTechFormat.replace(/\{\{\s*link\s*\}\}/gi, techUrl),
        linksCommitteeFormat
          .replace(/\{\{\s*team\s*\}\}/gi, 'Software')
          .replace(/\{\{\s*link\s*\}\}/gi, softwareUrl),
      ];
      computedLinksSection = `${linksHeader}\n\n${linksItems.join('\n\n')}`;
    } else {
      // REJECTED
      computedDecisionBody = decisionRejected.replace(/\{\{\s*applied_teams\s*\}\}/gi, `Software${teamsFormat}PR & Logistics`);
      computedLinksSection = ''; // Zero links on double rejection rule
    }

    return raw
      .replace(/\{\{\s*name\s*\}\}/gi, 'محمد أحمد')
      .replace(/\{\{\s*(first_name|firstName|first\s*name|الاسم_الاول|الاسم\s*الأول)\s*\}\}/gi, 'محمد')
      .replace(/\{\{\s*teams\s*\}\}/gi, `Software${teamsFormat}PR & Logistics`)
      .replace(/\{\{\s*decision_body\s*\}\}/gi, computedDecisionBody)
      .replace(/\{\{\s*links_section\s*\}\}/gi, computedLinksSection)
      .replace(/\{\{\s*accepted_teams\s*\}\}/gi, 'Software')
      .replace(/\{\{\s*rejected_teams\s*\}\}/gi, 'PR & Logistics')
      .replace(/\{\{\s*applied_teams\s*\}\}/gi, `Software${teamsFormat}PR & Logistics`)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, [
    templateMap,
    selectedTemplateId,
    previewMode,
    decisionAccepted,
    decisionPartial,
    decisionRejected,
    linksHeader,
    linksFamilyFormat,
    linksTechFormat,
    linksMediaFormat,
    linksCommitteeFormat,
    meetingLinkFormat,
    venueFormat,
    timeFormat,
    teamsFormat,
    customVars,
    links,
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header - Aligned with IEEE ECU Admin Theme using Red Accents */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D92525] animate-pulse" />
            <span className="text-xs font-bold text-[#D92525] tracking-widest uppercase">
              WhatsApp Communication Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            WhatsApp & Groups <span className="text-[#D92525]">Studio</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage hierarchical WhatsApp group links, customize decision templates &amp; link formatting.
          </p>
        </div>

        {/* Studio Navigation Tabs - Clean Responsive Admin Style */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('LINKS')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 sm:gap-2 text-center ${
              activeTab === 'LINKS'
                ? 'bg-[#D92525]/15 text-white border border-[#D92525]/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LinkIcon size={14} className={activeTab === 'LINKS' ? 'text-[#D92525]' : ''} />
            <span className="truncate">Group Links</span>
          </button>

          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 sm:gap-2 text-center ${
              activeTab === 'TEMPLATES'
                ? 'bg-[#D92525]/15 text-white border border-[#D92525]/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={14} className={activeTab === 'TEMPLATES' ? 'text-[#D92525]' : ''} />
            <span className="truncate">Templates</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: GROUP LINKS                                         */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'LINKS' && (
        <form onSubmit={handleSaveLinks} className="space-y-6">
          {linksMsg && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3.5 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>{linksMsg}</span>
            </div>
          )}

          {/* Privacy & Double Rejection Rule Banner */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-white">Strict Double Rejection Rule:</div>
              <p className="text-slate-400 leading-relaxed">
                Candidates rejected in both preferences receive ZERO group links. Group links are exclusively dispatched to accepted candidates for their assigned committee + Family Group for all + Tech/Media Mega group if applicable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mega Groups */}
            <div className="admin-card rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <Users size={16} className="text-[#D92525]" />
                <span>Mega WhatsApp Groups</span>
              </h3>

              {/* Family Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Family Group (All Accepted)</span>
                  <span className="text-[10px] text-emerald-400 font-medium">Required for all</span>
                </label>
                <input
                  type="url"
                  value={links.familyLink}
                  onChange={(e) => setLinks({ ...links, familyLink: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-black/40 border border-white/10 focus:border-[#D92525] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition"
                />
              </div>

              {/* Tech Mega Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Cpu size={14} className="text-blue-400" />
                  <span>Tech Mega Group (All Tech)</span>
                </label>
                <input
                  type="url"
                  value={links.techMegaLink}
                  onChange={(e) => setLinks({ ...links, techMegaLink: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-black/40 border border-white/10 focus:border-[#D92525] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition"
                />
                <p className="text-[10px] text-slate-500">Dispatched to all candidates accepted into Tech committees.</p>
              </div>

              {/* Media Mega Group - ALL MEDIA ONLY */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette size={14} className="text-purple-400" />
                    <span>Media Mega Group</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold border border-purple-500/20">
                    All Media
                  </span>
                </label>
                <input
                  type="url"
                  value={links.mediaMegaLink}
                  onChange={(e) => setLinks({ ...links, mediaMegaLink: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-black/40 border border-white/10 focus:border-[#D92525] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition"
                />
                <p className="text-[10px] text-slate-500">Dispatched to all candidates accepted into Media committees (Visuals, Graphics, etc.).</p>
              </div>
            </div>

            {/* Individual Committee Groups */}
            <div className="lg:col-span-2 admin-card rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <Layers size={16} className="text-[#D92525]" />
                <span>Individual Committee Groups ({TEAMS.length} Committees)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {TEAMS.map((team) => (
                  <div key={team.id} className="space-y-1.5 bg-black/25 p-3 rounded-xl border border-white/5 hover:border-white/10 transition">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                        <span>{team.name}</span>
                      </label>
                      <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.5 rounded bg-white/5">
                        {team.broadCategory}
                      </span>
                    </div>
                    <input
                      type="url"
                      value={links.teamLinks?.[team.id] || ''}
                      onChange={(e) =>
                        setLinks({
                          ...links,
                          teamLinks: { ...(links.teamLinks || {}), [team.id]: e.target.value },
                        })
                      }
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg px-3 py-1.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingLinks}
              className="px-6 py-2.5 rounded-xl bg-[#D92525] hover:bg-[#b81e1e] text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-red-950/40"
            >
              {savingLinks ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>Save All Group Links</span>
            </button>
          </div>
        </form>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: TEMPLATES & ADVANCED CUSTOMIZATION                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'TEMPLATES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Editors */}
          <div className="lg:col-span-7 space-y-5">
            {templateMsg && (
              <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3.5 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>{templateMsg}</span>
              </div>
            )}

            {/* Template Selector Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'COMBINED_DECISION', label: '1. Combined Decision (قبول / رفض)' },
                { id: 'INTERVIEW_INVITATION', label: '2. Interview Invitation (دعوة المقابلة)' },
                { id: 'INTERVIEW_RESCHEDULED', label: '3. Reschedule Notice (تعديل الموعد)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplateTab(t.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                    selectedTemplateId === t.id
                      ? 'bg-[#D92525]/15 text-white border-[#D92525]/50 font-bold shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Main Template Editor */}
            <div className="admin-card rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={15} className="text-[#D92525]" />
                  <span>Main Message Template</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 hidden sm:inline">Supports bold (*text*) and italic (_text_)</span>
                  <button
                    type="button"
                    onClick={handleSaveAllTemplates}
                    disabled={savingTemplate}
                    className="px-3.5 py-1.5 rounded-xl bg-[#D92525] hover:bg-[#b81e1e] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-red-950/30 active:scale-95 disabled:opacity-50"
                  >
                    {savingTemplate ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Save Template</span>
                  </button>
                </div>
              </div>

              {/* Placeholder Badges */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Available placeholders (click to insert):</span>
                  <span className="text-[10px] text-slate-500 font-mono">Customizable in the panel below</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{{first_name}}',
                    '{{name}}',
                    '{{teams}}',
                    '{{date}}',
                    '{{time}}',
                    '{{venue}}',
                    '{{meeting_link_line}}',
                    '{{decision_body}}',
                    '{{links_section}}',
                    ...customVars.map((cv) => `{{${cv.key}}}`),
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setTemplateMap((prev) => ({
                          ...prev,
                          [selectedTemplateId]: (prev[selectedTemplateId] || '') + ' ' + tag,
                        }))
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#D92525]/20 text-slate-300 hover:text-white text-[11px] font-mono border border-white/10 transition active:scale-95"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={templateMap[selectedTemplateId] || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setTemplateMap((prev) => ({
                    ...prev,
                    [selectedTemplateId]: val,
                  }));
                }}
                rows={9}
                dir="rtl"
                className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-xl p-3.5 text-xs text-white outline-none leading-relaxed font-sans"
              />
            </div>

            {/* DYNAMIC PLACEHOLDERS CUSTOMIZER */}
            <div className="admin-card rounded-2xl p-5 space-y-4">
              <div className="border-b border-white/10 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Settings2 size={15} className="text-[#D92525]" />
                    <span>Customize Dynamic Placeholders</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configure the expansion content and format for each placeholder tag.
                  </p>
                </div>

                {/* Sub-category selector */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'DECISION', label: 'Decision Body' },
                    { id: 'LINKS', label: 'Group Links' },
                    { id: 'MEETING', label: 'Meeting Link' },
                    { id: 'VENUE', label: 'Venue & Time' },
                    { id: 'CUSTOM', label: 'Custom Tags' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActivePlaceholderCategory(cat.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border ${
                        activePlaceholderCategory === cat.id
                          ? 'bg-[#D92525]/20 text-white border-[#D92525]/40'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category 1: Decision Body */}
              {activePlaceholderCategory === 'DECISION' && (
                <div className="space-y-3 animate-in fade-in">
                  {/* Case 1: Full Acceptance */}
                  <div className="space-y-1.5 bg-black/25 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        1. Full Acceptance Body
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Placeholder: {'{{accepted_teams}}'}</span>
                    </div>
                    <textarea
                      value={decisionAccepted}
                      onChange={(e) => setDecisionAccepted(e.target.value)}
                      rows={2}
                      dir="rtl"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2.5 text-xs text-white outline-none leading-relaxed"
                    />
                  </div>

                  {/* Case 2: Partial Acceptance (Accept + Reject) */}
                  <div className="space-y-1.5 bg-black/25 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        2. Partial Acceptance Body (Accept + Reject)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Placeholders: {'{{accepted_teams}}'} & {'{{rejected_teams}}'}</span>
                    </div>
                    <textarea
                      value={decisionPartial}
                      onChange={(e) => setDecisionPartial(e.target.value)}
                      rows={3}
                      dir="rtl"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2.5 text-xs text-white outline-none leading-relaxed"
                    />
                  </div>

                  {/* Case 3: Rejection */}
                  <div className="space-y-1.5 bg-black/25 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        3. Rejection Body
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Placeholder: {'{{applied_teams}}'}</span>
                    </div>
                    <textarea
                      value={decisionRejected}
                      onChange={(e) => setDecisionRejected(e.target.value)}
                      rows={2}
                      dir="rtl"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2.5 text-xs text-white outline-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Category 2: Group Links */}
              {activePlaceholderCategory === 'LINKS' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Section Header Text:</label>
                    <input
                      type="text"
                      value={linksHeader}
                      onChange={(e) => setLinksHeader(e.target.value)}
                      dir="rtl"
                      className="w-full bg-black/40 border border-white/10 focus:border-[#D92525] rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Family Group Line */}
                    <div className="space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <label className="text-[11px] font-semibold text-slate-300">Family Group Line:</label>
                      <textarea
                        value={linksFamilyFormat}
                        onChange={(e) => setLinksFamilyFormat(e.target.value)}
                        rows={2}
                        dir="rtl"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2 text-xs text-white outline-none font-mono"
                      />
                      <span className="text-[9px] text-slate-400">Placeholder: {'{{link}}'}</span>
                    </div>

                    {/* Tech Mega Line */}
                    <div className="space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <label className="text-[11px] font-semibold text-slate-300">Tech Mega Line:</label>
                      <textarea
                        value={linksTechFormat}
                        onChange={(e) => setLinksTechFormat(e.target.value)}
                        rows={2}
                        dir="rtl"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2 text-xs text-white outline-none font-mono"
                      />
                      <span className="text-[9px] text-slate-400">Placeholder: {'{{link}}'}</span>
                    </div>

                    {/* Media Mega Line */}
                    <div className="space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <label className="text-[11px] font-semibold text-slate-300">Media Mega Line:</label>
                      <textarea
                        value={linksMediaFormat}
                        onChange={(e) => setLinksMediaFormat(e.target.value)}
                        rows={2}
                        dir="rtl"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2 text-xs text-white outline-none font-mono"
                      />
                      <span className="text-[9px] text-slate-400">Placeholder: {'{{link}}'}</span>
                    </div>

                    {/* Committee Line */}
                    <div className="space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <label className="text-[11px] font-semibold text-slate-300">Committee Line:</label>
                      <textarea
                        value={linksCommitteeFormat}
                        onChange={(e) => setLinksCommitteeFormat(e.target.value)}
                        rows={2}
                        dir="rtl"
                        className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2 text-xs text-white outline-none font-mono"
                      />
                      <span className="text-[9px] text-slate-400">Placeholders: {'{{team}}'} & {'{{link}}'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Category 3: Meeting Link */}
              {activePlaceholderCategory === 'MEETING' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                    <label className="text-xs font-semibold text-slate-300">
                      Online Meeting Link Line Format ({'{{meeting_link_line}}'}):
                    </label>
                    <textarea
                      value={meetingLinkFormat}
                      onChange={(e) => setMeetingLinkFormat(e.target.value)}
                      rows={2}
                      dir="rtl"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-400">
                      Use {'{{link}}'} to represent the Google Meet link. In offline interviews, this line is automatically omitted.
                    </span>
                  </div>
                </div>
              )}

              {/* Category 4: Venue & Time */}
              {activePlaceholderCategory === 'VENUE' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                    <label className="text-xs font-semibold text-slate-300">
                      Default Offline Venue Format ({'{{venue}}'}):
                    </label>
                    <input
                      type="text"
                      value={venueFormat}
                      onChange={(e) => setVenueFormat(e.target.value)}
                      dir="rtl"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                    <label className="text-xs font-semibold text-slate-300">
                      Time Slot Format ({'{{time}}'}):
                    </label>
                    <input
                      type="text"
                      value={timeFormat}
                      onChange={(e) => setTimeFormat(e.target.value)}
                      dir="rtl"
                      className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-400">
                      Supports placeholders {'{{start}}'} and {'{{end}}'} in 12h format (e.g. 10:00 AM, 02:00 PM).
                    </span>
                  </div>

                  <div className="space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                    <label className="text-xs font-semibold text-slate-300">
                      Teams Separator ({'{{teams}}'}):
                    </label>
                    <input
                      type="text"
                      value={teamsFormat}
                      onChange={(e) => setTeamsFormat(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 focus:border-[#D92525] rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-400">
                      Character(s) used between multiple applied committees (e.g. &quot; &amp; &quot; or &quot; و &quot;).
                    </span>
                  </div>
                </div>
              )}

              {/* Category 5: Custom Placeholders */}
              {activePlaceholderCategory === 'CUSTOM' && (
                <div className="space-y-3 animate-in fade-in">
                  <p className="text-xs text-slate-300">
                    Define custom variables to inject dynamic organization text, guidelines, or notices into any WhatsApp template.
                  </p>

                  {/* Add New Custom Variable */}
                  <div className="bg-black/30 p-3 rounded-xl border border-white/10 space-y-2">
                    <span className="text-xs font-bold text-white block">Add New Custom Variable</span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        placeholder="Tag name (e.g. dress_code)"
                        value={newVarKey}
                        onChange={(e) => setNewVarKey(e.target.value)}
                        className="sm:col-span-4 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Expansion text (e.g. Formal Attire)"
                        value={newVarValue}
                        onChange={(e) => setNewVarValue(e.target.value)}
                        className="sm:col-span-6 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomPlaceholder}
                        className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#D92525] hover:bg-[#b81e1e] text-white text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Existing Custom Variables List */}
                  {customVars.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4 bg-black/15 rounded-xl border border-white/5">
                      No custom placeholders defined yet. Add one above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customVars.map((cv) => (
                        <div
                          key={cv.key}
                          className="flex items-center gap-2 bg-black/25 p-2.5 rounded-xl border border-white/5"
                        >
                          <span className="px-2 py-1 rounded bg-white/5 text-slate-300 font-mono text-xs border border-white/10 shrink-0">
                            {`{{${cv.key}}}`}
                          </span>
                          <input
                            type="text"
                            value={cv.value}
                            onChange={(e) => handleUpdateCustomPlaceholderValue(cv.key, e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomPlaceholder(cv.key)}
                            className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveAllTemplates}
                disabled={savingTemplate}
                className="px-6 py-2.5 rounded-xl bg-[#D92525] hover:bg-[#b81e1e] text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-red-950/40"
              >
                {savingTemplate ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>Save All Templates &amp; Customizations</span>
              </button>
            </div>
          </div>

          {/* Right Column: Authentic WhatsApp Live Preview */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-3">
            {/* Preview Case Switcher (when Combined Decision is selected) */}
            {selectedTemplateId === 'COMBINED_DECISION' && (
              <div className="w-full max-w-[360px] bg-white/5 p-1 rounded-xl border border-white/10 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('FULL_ACCEPT')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition text-center text-xs ${
                    previewMode === 'FULL_ACCEPT'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Full Acceptance
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('PARTIAL_ACCEPT')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition text-center text-xs ${
                    previewMode === 'PARTIAL_ACCEPT'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Partial Acceptance
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('REJECTED')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition text-center text-xs ${
                    previewMode === 'REJECTED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rejection
                </button>
              </div>
            )}

            {/* Authentic WhatsApp Dark Mode Container */}
            <div className="w-full max-w-[360px] rounded-3xl border border-slate-800 bg-[#0b141a] shadow-2xl overflow-hidden flex flex-col">
              {/* WhatsApp Header */}
              <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3 border-b border-white/5 text-white">
                <div className="w-9 h-9 rounded-full bg-[#00a1c0] flex items-center justify-center font-bold text-xs text-white shadow-inner">
                  IEEE
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">IEEE ECU Student Branch</div>
                  <div className="text-[10px] text-[#25D366] font-medium">Online</div>
                </div>
              </div>

              {/* Chat Canvas with Wallpaper Pattern & Real Message Bubble */}
              <div
                className="p-3.5 min-h-[460px] max-h-[560px] overflow-y-auto flex flex-col justify-end"
                style={{
                  backgroundColor: '#0b141a',
                  backgroundImage:
                    'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Outgoing Message Bubble */}
                <div
                  dir="rtl"
                  className="bg-[#005c4b] text-[#e9edef] p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed whitespace-pre-wrap shadow-md max-w-[92%] self-start font-sans"
                  style={{
                    fontFamily:
                      "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif",
                    unicodeBidi: 'plaintext',
                  }}
                >
                  {previewText}
                  <div className="text-[9px] text-[#8696a0] text-left mt-1.5 flex items-center justify-start gap-1 font-mono">
                    <span>11:30 AM</span>
                    <span className="text-[#53bdeb] inline-flex items-center">
                      <Check size={12} strokeWidth={2.5} />
                      <Check size={12} strokeWidth={2.5} className="-ml-1.5" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1f2c34]/50 border-t border-white/5 py-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                <Eye size={12} className="text-emerald-400" />
                <span>Live Candidate WhatsApp Simulator</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
