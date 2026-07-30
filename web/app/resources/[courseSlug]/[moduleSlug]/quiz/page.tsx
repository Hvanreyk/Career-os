import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { QuizRunner } from '@/components/courses/QuizRunner';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { StatusLabel } from '@/components/ui/Status';
import { StateBlock } from '@/components/ui/StateBlock';
import { Button } from '@/components/ui/Button';
import { resourceHasCapability } from '@/lib/resources/catalog';

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
  if (!resourceHasCapability(courseSlug, 'quizzes')) notFound();
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
    <PageShell width="narrow">
      <Link
        href={`/resources/${courseSlug}`}
        className="ml-label inline-flex min-h-[44px] items-center hover:text-bone"
      >
        <span aria-hidden="true" className="mr-2">
          ◂
        </span>
        {course.title}
      </Link>

      <PageHeader
        className="mt-1"
        label="Module quiz"
        title={module.title}
        lede={
          questions.length > 0
            ? `${questions.length} questions, graded on submission. Answers and explanations appear once you submit.`
            : undefined
        }
        actions={
          best ? (
            <StatusLabel>
              Best {best.score}/{best.total}
            </StatusLabel>
          ) : (
            <StatusLabel>No attempts yet</StatusLabel>
          )
        }
      />

      <div className="mt-10">
        {questions.length === 0 ? (
          <StateBlock
            kind="empty"
            title="This quiz isn't published yet"
            action={
              <Button href={`/resources/${courseSlug}`} variant="secondary">
                Back to the course
              </Button>
            }
          >
            The module content is available — the graded questions for it are still being
            written.
          </StateBlock>
        ) : (
          <QuizRunner
            moduleId={module.id}
            questions={questions}
            courseHref={`/resources/${courseSlug}`}
          />
        )}
      </div>
    </PageShell>
  );
}
