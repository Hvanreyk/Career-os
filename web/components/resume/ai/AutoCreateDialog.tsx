'use client';

import { useEffect, useState } from 'react';
import { ResumeDocumentSchema, type AdditionalDetails, type ResumeDocument } from '@trajectoryos/core/resume/document';
import type { ComposeProfileInput } from '@trajectoryos/core/llm/resume-compose';
import { api } from '../api';
import { useResumeAiJob } from '../useResumeAiJob';
import { Dialog } from './Dialog';
import { DocumentProposal } from './ProposalReview';
import { Notice } from './Notice';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { StateBlock } from '@/components/ui/StateBlock';
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
      ) : state.phase === 'completed' ? (
        <div className="space-y-4">
          <Notice tone="error" title="Could not validate">
            The AI returned a resume we couldn&apos;t validate. Nothing was applied — your details
            above are still here, so you can try again.
          </Notice>
          <Button variant="secondary" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      ) : loadError ? (
        <Notice tone="warn" alert>{loadError}</Notice>
      ) : !profile ? (
        <StateBlock kind="loading" title="Loading your profile…" />
      ) : (
        <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
          <div className="ml-panel-raised p-4">
            <p className="ml-label">From your onboarding profile</p>
            <p className="mt-2 text-[15px] leading-snug text-bone">
              {profile.degree} — {profile.university} (Year {profile.current_year}, graduating{' '}
              {profile.expected_graduation_year})
            </p>
            {profile.majors.length > 0 && (
              <p className="mt-1.5 text-[13px] text-graphite">Majors: {profile.majors.join(', ')}</p>
            )}
            {profile.wam_label && (
              <p className="mt-1.5 text-[13px] text-graphite">{profile.wam_label}</p>
            )}
            {profile.achievement_labels.length > 0 && (
              <p className="mt-1.5 text-[13px] text-graphite">
                Achievements: {profile.achievement_labels.join(' · ')}
              </p>
            )}
          </div>

          <section>
            <h3 className="border-b border-rule pb-2 text-[15px] font-bold uppercase tracking-[-0.01em] text-bone">
              Contact details
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {([['full_name', 'Full name', 120], ['email', 'Email', 254], ['phone', 'Phone', 40], ['linkedin_url', 'LinkedIn URL', 200], ['location', 'Location (e.g. Sydney, NSW)', 120]] as const).map(([key, placeholder, max]) => (
                <Field key={key} label={placeholder}>
                  {(props) => (
                    <input
                      {...props}
                      value={contact[key]}
                      maxLength={max}
                      onChange={(e) => setContact((current) => ({ ...current, [key]: e.target.value }))}
                      className="ml-field"
                    />
                  )}
                </Field>
              ))}
            </div>
          </section>

          {experiences.length > 0 && (
            <section>
              <h3 className="border-b border-rule pb-2 text-[15px] font-bold uppercase tracking-[-0.01em] text-bone">
                Your experiences — what did you actually do?
              </h3>
              <div className="mt-4 space-y-4">
                {experiences.map((experience, index) => (
                  <div key={`${experience.firm}-${index}`} className="ml-panel-raised space-y-3 p-4">
                    <p className="text-[15px] font-bold text-bone">{experience.firm}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={experience.role_title}
                        maxLength={120}
                        placeholder="Role title (e.g. Summer Analyst)"
                        aria-label={`Role title at ${experience.firm}`}
                        onChange={(e) => setExperiences((rows) => rows.map((row, i) => i === index ? { ...row, role_title: e.target.value } : row))}
                        className="ml-field"
                      />
                      <input
                        value={experience.date_range}
                        maxLength={60}
                        placeholder="Dates (e.g. Nov 2024 – Feb 2025)"
                        aria-label={`Dates at ${experience.firm}`}
                        onChange={(e) => setExperiences((rows) => rows.map((row, i) => i === index ? { ...row, date_range: e.target.value } : row))}
                        className="ml-field"
                      />
                    </div>
                    <textarea
                      value={experience.responsibilities}
                      rows={3}
                      maxLength={2500}
                      placeholder={'In plain language, one per line:\nBuilt a discounted cash flow model for a retail client\nJoined client calls and took notes'}
                      aria-label={`What you did at ${experience.firm}`}
                      onChange={(e) => setExperiences((rows) => rows.map((row, i) => i === index ? { ...row, responsibilities: e.target.value } : row))}
                      className="ml-field resize-y"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="border-b border-rule pb-2 text-[15px] font-bold uppercase tracking-[-0.01em] text-bone">
              Everything else
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Skills" hint="Comma-separated.">
                {(props) => (
                  <input
                    {...props}
                    value={skills}
                    placeholder="Excel, PowerPoint, Python, financial modelling"
                    onChange={(e) => setSkills(e.target.value)}
                    className="ml-field"
                  />
                )}
              </Field>
              <Field label="Interests" hint="Comma-separated.">
                {(props) => (
                  <input
                    {...props}
                    value={interests}
                    placeholder="AFL, chess, surf lifesaving"
                    onChange={(e) => setInterests(e.target.value)}
                    className="ml-field"
                  />
                )}
              </Field>
            </div>

            <Field label="Education extras" hint="Scholarships, relevant coursework, exchange.">
              {(props) => (
                <textarea
                  {...props}
                  value={educationExtras}
                  rows={2}
                  maxLength={1000}
                  onChange={(e) => setEducationExtras(e.target.value)}
                  className="ml-field resize-y"
                />
              )}
            </Field>

            <Field
              label="Anything else worth including?"
              hint="Part-time jobs, volunteering, side projects, competitions…"
            >
              {(props) => (
                <textarea
                  {...props}
                  value={anythingElse}
                  rows={3}
                  maxLength={2000}
                  onChange={(e) => setAnythingElse(e.target.value)}
                  className="ml-field resize-y"
                />
              )}
            </Field>
          </section>

          {state.phase === 'error' && <Notice tone="error" alert>{state.error}</Notice>}
          {applyError && <Notice tone="error" alert>{applyError}</Notice>}

          <div className="border-t border-rule pt-5">
            <Button
              onClick={() => void run(() => api<{ jobId: string }>('/compose', 'POST', { details: buildDetails() }))}
              loading={working}
              className="w-full"
            >
              {working ? 'Drafting your resume…' : 'Generate my draft resume'}
            </Button>
            <p className="mt-3 text-[13px] leading-snug text-graphite">
              AI only uses what you and onboarding provided — it never invents experience, and
              flags missing specifics as placeholders.
            </p>
          </div>
        </div>
      )}
    </Dialog>
  );
}
