'use client';

import { useEffect, useState } from 'react';
import { ResumeDocumentSchema, type AdditionalDetails, type ResumeDocument } from '@trajectoryos/core/resume/document';
import type { ComposeProfileInput } from '@trajectoryos/core/llm/resume-compose';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { api } from '../api';
import { useResumeAiJob } from '../useResumeAiJob';
import { Dialog } from './Dialog';
import { DocumentProposal } from './ProposalReview';
import type { WorkspaceRows } from '../ResumeBuilder';

interface Props {
  hasExistingContent: boolean;
  onClose: () => void;
  onApplied: (workspace: WorkspaceRows) => void;
}

interface ExperienceForm {
  firm: string;
  role_title: string;
  date_range: string;
  responsibilities: string;
}

const splitList = (value: string) =>
  value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);

/**
 * The auto-create flow: shows what onboarding already knows, collects the
 * resume-specific details onboarding never asked for, then generates a
 * first-draft resume for explicit review.
 */
export function AutoCreateDialog({ hasExistingContent, onClose, onApplied }: Props) {
  const [profile, setProfile] = useState<ComposeProfileInput | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contact, setContact] = useState({ full_name: '', email: '', phone: '', linkedin_url: '', location: '' });
  const [experiences, setExperiences] = useState<ExperienceForm[]>([]);
  const [educationExtras, setEducationExtras] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [anythingElse, setAnythingElse] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const { state, run, reset } = useResumeAiJob();

  useEffect(() => {
    void api<{ profile: ComposeProfileInput; contact_email: string | null }>('/compose', 'GET')
      .then((value) => {
        setProfile(value.profile);
        setContact((current) => ({ ...current, email: value.contact_email ?? '' }));
        setExperiences(value.profile.experiences.map((experience) => ({
          firm: experience.firm,
          role_title: '',
          date_range: '',
          responsibilities: '',
        })));
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Could not load your profile');
      });
  }, []);

  const proposal = state.phase === 'completed'
    ? ResumeDocumentSchema.safeParse(state.output?.document)
    : null;

  function buildDetails(): AdditionalDetails {
    return {
      contact: {
        full_name: contact.full_name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        linkedin_url: contact.linkedin_url.trim(),
        location: contact.location.trim(),
      },
      experience_details: experiences.map((experience) => ({
        firm: experience.firm,
        role_title: experience.role_title.trim(),
        date_range: experience.date_range.trim(),
        responsibilities: experience.responsibilities
          .split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 5),
      })),
      education_extras: educationExtras.trim(),
      skills: splitList(skills).slice(0, 20),
      interests: splitList(interests).slice(0, 10),
      anything_else: anythingElse.trim(),
    };
  }

  async function apply(document: ResumeDocument) {
    setApplying(true); setApplyError(null);
    try {
      await api('/resume', 'POST', {}).catch(() => undefined);
      const result = await api<{ workspace: WorkspaceRows }>('/document', 'PUT', document);
      onApplied(result.workspace);
      onClose();
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Could not create the resume');
    } finally {
      setApplying(false);
    }
  }

  const working = state.phase === 'creating' || state.phase === 'processing';
  const input = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm';
  const label = 'block text-xs text-slate-500';

  return (
    <Dialog
      title="Auto-create your resume"
      subtitle="We already have your profile from onboarding. Add the details a resume needs that onboarding never asked for — then AI drafts it for your review."
      wide
      onClose={onClose}
    >
      {proposal?.success ? (
        <DocumentProposal
          document={proposal.data}
          applying={applying}
          confirmLabel="Create my resume"
          replaceWarning={hasExistingContent}
          onApply={() => void apply(proposal.data)}
          onCancel={() => { reset(); }}
        />
      ) : loadError ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-amber-200 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{loadError}
        </div>
      ) : !profile ? (
        <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading your profile…</div>
      ) : (
        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-widest text-gold-400 mb-2">From your onboarding profile</p>
            <p className="text-slate-300 text-sm">{profile.degree} — {profile.university} (Year {profile.current_year}, graduating {profile.expected_graduation_year})</p>
            {profile.majors.length > 0 && <p className="text-slate-400 text-xs mt-1">Majors: {profile.majors.join(', ')}</p>}
            {profile.wam_label && <p className="text-slate-400 text-xs mt-1">{profile.wam_label}</p>}
            {profile.achievement_labels.length > 0 && <p className="text-slate-400 text-xs mt-1">Achievements: {profile.achievement_labels.join(' · ')}</p>}
          </div>

          <div>
            <p className="text-white text-sm font-semibold mb-2">Contact details</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {([['full_name', 'Full name', 120], ['email', 'Email', 254], ['phone', 'Phone', 40], ['linkedin_url', 'LinkedIn URL', 200], ['location', 'Location (e.g. Sydney, NSW)', 120]] as const).map(([key, placeholder, max]) => (
                <label key={key} className={label}>{placeholder}
                  <input value={contact[key]} maxLength={max} onChange={(e) => setContact((current) => ({ ...current, [key]: e.target.value }))} className={`mt-1 ${input}`} />
                </label>
              ))}
            </div>
          </div>

          {experiences.length > 0 && (
            <div>
              <p className="text-white text-sm font-semibold mb-2">Your experiences — what did you actually do?</p>
              <div className="space-y-3">
                {experiences.map((experience, index) => (
                  <div key={`${experience.firm}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                    <p className="text-gold-300 text-sm font-medium">{experience.firm}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input value={experience.role_title} maxLength={120} placeholder="Role title (e.g. Summer Analyst)" onChange={(e) => setExperiences((rows) => rows.map((row, i) => i === index ? { ...row, role_title: e.target.value } : row))} className={input} />
                      <input value={experience.date_range} maxLength={60} placeholder="Dates (e.g. Nov 2024 – Feb 2025)" onChange={(e) => setExperiences((rows) => rows.map((row, i) => i === index ? { ...row, date_range: e.target.value } : row))} className={input} />
                    </div>
                    <textarea value={experience.responsibilities} rows={3} maxLength={2500} placeholder={'In plain language, one per line:\nBuilt a discounted cash flow model for a retail client\nJoined client calls and took notes'} onChange={(e) => setExperiences((rows) => rows.map((row, i) => i === index ? { ...row, responsibilities: e.target.value } : row))} className={`${input} resize-y`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className={label}>Skills (comma-separated)
              <input value={skills} placeholder="Excel, PowerPoint, Python, financial modelling" onChange={(e) => setSkills(e.target.value)} className={`mt-1 ${input}`} />
            </label>
            <label className={label}>Interests (comma-separated)
              <input value={interests} placeholder="AFL, chess, surf lifesaving" onChange={(e) => setInterests(e.target.value)} className={`mt-1 ${input}`} />
            </label>
          </div>

          <label className={label}>Education extras — scholarships, relevant coursework, exchange
            <textarea value={educationExtras} rows={2} maxLength={1000} onChange={(e) => setEducationExtras(e.target.value)} className={`mt-1 ${input} resize-y`} />
          </label>

          <label className={label}>Anything else worth including? Part-time jobs, volunteering, side projects, competitions…
            <textarea value={anythingElse} rows={3} maxLength={2000} onChange={(e) => setAnythingElse(e.target.value)} className={`mt-1 ${input} resize-y`} />
          </label>

          {state.phase === 'error' && (
            <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-red-300 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{state.error}</div>
          )}
          {applyError && (
            <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-red-300 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{applyError}</div>
          )}

          <button
            onClick={() => void run(() => api<{ jobId: string }>('/compose', 'POST', { details: buildDetails() }))}
            disabled={working}
            className="w-full px-5 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {working ? <><Loader2 className="w-4 h-4 animate-spin" />Drafting your resume…</> : <><Sparkles className="w-4 h-4" />Generate my draft resume</>}
          </button>
          <p className="text-xs text-slate-500 text-center">AI only uses what you and onboarding provided — it never invents experience, and flags missing specifics as placeholders.</p>
        </div>
      )}
    </Dialog>
  );
}
