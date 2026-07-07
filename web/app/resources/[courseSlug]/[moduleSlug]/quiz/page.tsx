import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { QuizRunner } from '@/components/courses/QuizRunner';

export const dynamic = 'force-dynamic';

interface Params {
  courseSlug: string;
  moduleSlug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { moduleSlug } = await params;
  return { title: `Quiz — ${moduleSlug}` };
}

export default async function ModuleQuizPage({ params }: { params: Promise<Params> }) {
  const { courseSlug, moduleSlug } = await params;
  const user = await requireUser(`/resources/${courseSlug}/${moduleSlug}/quiz`);

  // Course + module resolve through RLS (published rows only)…
  const supabase = await createClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title')
    .eq('slug', courseSlug)
    .maybeSingle();
  if (!course) notFound();

  const { data: module } = await supabase
    .from('course_modules')
    .select('id, slug, title')
    .eq('course_id', course.id)
    .eq('slug', moduleSlug)
    .maybeSingle();
  if (!module) notFound();

  // …but questions are service-role-only (RLS has no policies), so the
  // correct answers never leave the server: strip before rendering.
  const serviceClient = createServiceClient();
  const { data: questionRows } = await serviceClient
    .from('quiz_questions')
    .select('id, prompt, options, sort_order')
    .eq('module_id', module.id)
    .eq('status', 'published')
    .order('sort_order');

  const questions = (questionRows ?? []).map((q) => ({
    id: q.id as string,
    prompt: q.prompt as string,
    options: q.options as { id: string; text: string }[],
  }));

  // Best previous attempt (RLS-scoped to the signed-in user).
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('score, total, created_at')
    .eq('module_id', module.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  const best = (attempts ?? []).reduce<{ score: number; total: number } | null>(
    (acc, a) => (acc === null || a.score > acc.score ? { score: a.score, total: a.total } : acc),
    null,
  );

  return (
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/resources/${courseSlug}`}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            {course.title}
          </Link>
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-2">
            Module quiz
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white">{module.title}</h1>
          {best && (
            <p className="text-sm text-slate-500 mt-3">
              Best attempt so far: <span className="text-gold-400 font-medium">{best.score}/{best.total}</span>
            </p>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="glass rounded-2xl border border-white/8 p-8 text-center">
            <p className="text-slate-400">This module&apos;s quiz isn&apos;t available yet.</p>
            <Link
              href={`/resources/${courseSlug}`}
              className="mt-4 inline-flex text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              Back to the course
            </Link>
          </div>
        ) : (
          <QuizRunner
            moduleId={module.id}
            questions={questions}
            courseHref={`/resources/${courseSlug}`}
          />
        )}
      </div>
    </div>
  );
}
