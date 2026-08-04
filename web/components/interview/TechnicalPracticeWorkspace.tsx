'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Panel, PanelHeader, Stat } from '@/components/ui/Panel';
import { StatusLabel } from '@/components/ui/Status';

type PracticeMode = 'diagnostic' | 'practice';
type AnswerMode = 'text' | 'audio';

interface QuestionInstance {
  id: string;
  conceptId: string;
  topic: string;
  difficulty: string;
  variant: string;
  prompt: string;
  expectedDurationSeconds: { minimum: number; target: number; maximum: number };
  calculatorPolicy: string;
  mode: PracticeMode;
}

interface MasteryRow {
  concept_id: string;
  mastery_label: string;
  evidence_confidence: string;
  useful_attempts: number;
  variant_count: number;
  unresolved_fatal_misconceptions: string[];
}

interface Feedback {
  deterministic: {
    classification: string;
    checks: Array<{ code: string; status: string; expected: string; observed: string | null; expectedUnit: string | null }>;
    misconceptionCodes: string[];
  };
  qualitative: null | {
    strengths: string[];
    improvements: string[];
    nextAction: string;
    evidence: Array<{ rubricPointCode: string; classification: string; explanation: string }>;
  };
  qualitativeStatus: string;
  mastery: { label: string; confidence: string } | null;
  disclaimer: string;
}

export function TechnicalPracticeWorkspace({
  initialFullAccess,
  billingEnabled,
  initialMastery,
  initialAttemptCount,
}: {
  initialFullAccess: boolean;
  billingEnabled: boolean;
  initialMastery: MasteryRow[];
  initialAttemptCount: number;
}) {
  const fullAccess = initialFullAccess;
  const [mode, setMode] = useState<PracticeMode>(initialFullAccess ? 'practice' : 'diagnostic');
  const [answerMode, setAnswerMode] = useState<AnswerMode>('text');
  const [question, setQuestion] = useState<QuestionInstance | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [liveMode, setLiveMode] = useState<'simulation' | 'coach'>('simulation');
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!question || feedback) return;
    startedAt.current = Date.now();
    setSeconds(0);
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [question, feedback]);

  async function loadQuestion(nextMode = mode) {
    setLoading(true); setMessage(''); setFeedback(null); setAnswer('');
    try {
      const response = await fetch(`/api/resources/interview-preparation/technical/next?mode=${nextMode}`, { cache: 'no-store' });
      const data = await response.json();
      if (data.complete) { setQuestion(null); setMessage('Diagnostic complete. Your evidence map is ready; subscribe to keep practising across all variants.'); return; }
      if (!response.ok) throw new Error(data.error ?? 'Could not load a question');
      setQuestion(data.instance);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load a question'); }
    finally { setLoading(false); }
  }

  async function submitAnswer() {
    if (!question || !answer.trim()) return;
    setLoading(true); setMessage('');
    try {
      const response = await fetch('/api/resources/interview-preparation/technical/attempts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: question.id,
          answerMode,
          ...(answerMode === 'audio' ? { transcript: answer, transcriptModel: 'gpt-realtime-whisper' } : { answerText: answer }),
          durationSeconds: seconds,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save attempt');
      setFeedback(data.feedback);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save attempt'); }
    finally { setLoading(false); }
  }

  async function startLiveInterview() {
    if (!question) return;
    setLoading(true); setMessage(''); setAnswerMode('audio');
    try {
      const secretResponse = await fetch('/api/resources/interview-preparation/technical/realtime/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: question.id, mode: liveMode }),
      });
      const secretPayload = await secretResponse.json();
      if (!secretResponse.ok) throw new Error(secretPayload.error ?? 'Could not start live interview');
      const ephemeralKey = secretPayload.clientSecret?.value
        ?? secretPayload.clientSecret?.client_secret?.value
        ?? secretPayload.clientSecret?.client_secret;
      if (typeof ephemeralKey !== 'string') throw new Error('Realtime provider returned an invalid client secret.');
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = localStream;
      const connection = new RTCPeerConnection();
      peer.current = connection;
      const audio = document.createElement('audio');
      audio.autoplay = true;
      connection.ontrack = (event) => { audio.srcObject = event.streams[0] ?? null; };
      localStream.getTracks().forEach((track) => connection.addTrack(track, localStream));
      const channel = connection.createDataChannel('oai-events');
      channel.onmessage = (event) => {
        const data = JSON.parse(event.data) as { type?: string; transcript?: string };
        if (data.type === 'conversation.item.input_audio_transcription.completed' && data.transcript) {
          setAnswer((current) => `${current}${current ? '\n' : ''}${data.transcript}`);
        }
      };
      channel.onopen = () => channel.send(JSON.stringify({ type: 'response.create', response: { output_modalities: ['audio'] } }));
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST', body: offer.sdp,
        headers: { Authorization: `Bearer ${ephemeralKey}`, 'Content-Type': 'application/sdp' },
      });
      if (!sdpResponse.ok) throw new Error('Could not connect the live audio channel.');
      await connection.setRemoteDescription({ type: 'answer', sdp: await sdpResponse.text() });
      setLive(true);
    } catch (error) {
      stopLiveInterview();
      setMessage(error instanceof Error ? error.message : 'Could not start live interview');
    } finally { setLoading(false); }
  }

  function stopLiveInterview() {
    peer.current?.close(); peer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null;
    setLive(false);
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.65fr)]">
      <div>
        <Panel>
          <PanelHeader title="Practice controls" label={billingEnabled ? (fullAccess ? 'Full Core access' : 'Diagnostic access') : 'Open testing access'} />
          <div className="flex flex-wrap gap-3 p-4 sm:p-5">
            <Button variant={mode === 'diagnostic' ? 'primary' : 'secondary'} onClick={() => { setMode('diagnostic'); void loadQuestion('diagnostic'); }} loading={loading && mode === 'diagnostic'}>
              12-question diagnostic
            </Button>
            <Button variant={mode === 'practice' ? 'primary' : 'secondary'} disabled={!fullAccess} onClick={() => { setMode('practice'); void loadQuestion('practice'); }}>
              Adaptive practice
            </Button>
          </div>
        </Panel>

        {message && <p role="status" className="mt-4 border border-rule bg-surface p-4 text-[14px] text-warn">{message}</p>}

        {question ? (
          <Panel className="mt-5" raised>
            <PanelHeader
              title={`${question.conceptId} · ${question.variant.replaceAll('_', ' ')}`}
              label={question.difficulty.replaceAll('_', ' ')}
              action={<span className="ml-num text-[13px] text-graphite">{seconds}s / {question.expectedDurationSeconds.target}s target</span>}
            />
            <div className="p-5 sm:p-7">
              <p className="text-[20px] font-semibold leading-[1.5] text-bone">{question.prompt}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusLabel>{question.calculatorPolicy.replaceAll('_', ' ')}</StatusLabel>
                <StatusLabel>{question.topic.replaceAll('_', ' ')}</StatusLabel>
              </div>

              {!feedback && (
                <div className="mt-7 border-t border-rule pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant={answerMode === 'text' ? 'primary' : 'secondary'} onClick={() => setAnswerMode('text')}>Text</Button>
                      <Button size="sm" variant={answerMode === 'audio' ? 'primary' : 'secondary'} onClick={() => setAnswerMode('audio')}>Live audio</Button>
                    </div>
                    {answerMode === 'audio' && fullAccess && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select aria-label="Live interview mode" className="ml-field w-auto" value={liveMode} onChange={(event) => setLiveMode(event.target.value as 'simulation' | 'coach')} disabled={live}>
                          <option value="simulation">Simulation · feedback hidden</option>
                          <option value="coach">Coach · one live cue</option>
                        </select>
                        {live ? <Button size="sm" variant="secondary" onClick={stopLiveInterview}>Stop interview</Button>
                          : <Button size="sm" onClick={startLiveInterview} loading={loading}>Start interview</Button>}
                      </div>
                    )}
                  </div>
                  <label htmlFor="technical-answer" className="ml-label mt-5 block">
                    {answerMode === 'audio' ? 'Live transcript — edit transcription errors before submitting' : 'Your answer'}
                  </label>
                  <textarea id="technical-answer" className="ml-field mt-2 min-h-44 resize-y" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={answerMode === 'audio' ? 'Your candidate-side transcript will appear here…' : 'Answer as if speaking to an interviewer. State assumptions.'} />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={submitAnswer} loading={loading} disabled={!answer.trim()}>Submit evidence</Button>
                    <Button variant="ghost" onClick={() => void loadQuestion()}>Skip this instance</Button>
                  </div>
                  {answerMode === 'audio' && <p className="mt-3 text-[13px] leading-snug text-graphite">Audio streams directly to the realtime provider using an ephemeral key. This implementation stores the submitted transcript, not raw audio.</p>}
                </div>
              )}

              {feedback && (
                <div className="mt-7 border-t border-rule pt-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-[17px] font-bold uppercase text-bone">Evidence feedback</h3>
                    <StatusLabel tone={feedback.deterministic.classification === 'correct' ? 'ok' : 'warn'}>{feedback.deterministic.classification.replaceAll('_', ' ')}</StatusLabel>
                  </div>
                  {feedback.deterministic.checks.length > 0 ? (
                    <ul className="mt-3 border-t border-rule">
                      {feedback.deterministic.checks.map((check) => (
                        <li key={check.code} className="ml-row py-3 text-[14px] text-bone">
                          <span className="ml-num mr-3 text-graphite">{check.status === 'pass' ? '✓' : '△'}</span>
                          {check.code}: observed {check.observed ?? 'no final value'}; expected {check.expected}{check.expectedUnit ? ` ${check.expectedUnit}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-3 text-[14px] text-graphite">Your qualitative answer is stored for rubric evidence classification. No numeric readiness score is inferred.</p>}
                  {feedback.deterministic.misconceptionCodes.length > 0 && <p className="mt-4 text-[14px] text-warn">Detected misconception: {feedback.deterministic.misconceptionCodes.join(', ')}. It must be cleared with two independent instances.</p>}
                  {feedback.qualitative && (
                    <div className="mt-5 grid gap-5 border-t border-rule pt-5 md:grid-cols-2">
                      <div>
                        <h4 className="ml-label text-ok">Evidence present</h4>
                        <ul className="mt-2 space-y-2 text-[14px] leading-snug text-bone">
                          {feedback.qualitative.strengths.map((strength) => <li key={strength}>✓ {strength}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="ml-label text-warn">Next correction</h4>
                        <ul className="mt-2 space-y-2 text-[14px] leading-snug text-bone">
                          {feedback.qualitative.improvements.map((improvement) => <li key={improvement}>△ {improvement}</li>)}
                        </ul>
                      </div>
                      <p className="md:col-span-2 text-[14px] font-semibold text-bone">Next action: {feedback.qualitative.nextAction}</p>
                    </div>
                  )}
                  {feedback.mastery && <p className="mt-4 text-[14px] text-bone">Concept evidence: <span className="font-bold">{feedback.mastery.label.replaceAll('_', ' ')}</span> · {feedback.mastery.confidence} confidence.</p>}
                  <p className="mt-3 text-[12px] leading-snug text-graphite">{feedback.disclaimer}</p>
                  <Button className="mt-5" onClick={() => void loadQuestion()} loading={loading}>Next independent variant</Button>
                </div>
              )}
            </div>
          </Panel>
        ) : (
          <Panel className="mt-5 p-6" raised>
            <p className="text-[16px] text-bone">Start the diagnostic to map prerequisites, or open adaptive practice if you have full access.</p>
          </Panel>
        )}
      </div>

      <aside className="space-y-5">
        <Panel>
          <PanelHeader title="Evidence ledger" label="No percentiles" />
          <div className="grid grid-cols-2 gap-5 p-5">
            <Stat label="Attempts" value={initialAttemptCount} />
            <Stat label="Concepts assessed" value={initialMastery.length} />
          </div>
          <p className="border-t border-rule p-4 text-[13px] leading-snug text-graphite">Rankings remain disabled until the minimum user, attempt, outcome, and comparison-cell thresholds are all met.</p>
        </Panel>
        <Panel>
          <PanelHeader title="Concept mastery" label={`${initialMastery.length}/60 assessed`} />
          {initialMastery.length ? (
            <ul className="max-h-[34rem] overflow-y-auto">
              {initialMastery.map((row) => (
                <li key={row.concept_id} className="ml-row p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="ml-num text-[13px] font-bold text-bone">{row.concept_id}</span>
                    <span className="ml-label">{row.evidence_confidence} evidence</span>
                  </div>
                  <p className="mt-1 text-[14px] font-semibold capitalize text-bone">{row.mastery_label.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-[12px] text-graphite">{row.useful_attempts} useful attempts · {row.variant_count}/7 variants</p>
                  {row.unresolved_fatal_misconceptions.length > 0 && <p className="mt-2 text-[12px] text-warn">Blocked: {row.unresolved_fatal_misconceptions.join(', ')}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="p-4 text-[14px] text-graphite">No mastery claim yet. Two useful attempts are required before the first label.</p>}
        </Panel>
      </aside>
    </div>
  );
}
