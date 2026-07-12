import type { Metadata } from 'next';
import { FloatingOrbs } from '@/components/background/FloatingOrbs';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { GlassCard } from '@/components/ui/GlassCard';
import { CourseCard } from '@/components/courses/CourseCard';
import { CourseIcon } from '@/components/courses/icons';
import { createClient } from '@/lib/supabase/server';
import type { CourseRow } from '@/lib/courses/types';
import { RESOURCE_CATALOG } from '@/lib/resources/catalog';
import { ArrowUpRight } from 'lucide-react';

export const metadata: Metadata = { title: 'Resources' };

// Live course + per-user progress state.
export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  const supabase = await createClient();

  // RLS returns published courses only (draft courses stay placeholders).
  const [{ data: courseRows }, { data: { user } }] = await Promise.all([
    supabase.from('courses').select('*').order('sort_order'),
    supabase.auth.getUser(),
  ]);
  const courses = new Map((courseRows as CourseRow[] | null ?? []).map((c) => [c.slug, c]));

  // Signed-in: compute progress % per published course in one query pair.
  const progressByCourse = new Map<string, number>();
  if (user && courses.size > 0) {
    const courseIds = [...courses.values()].map((c) => c.id);
    const [{ data: modules }, { data: progress }] = await Promise.all([
      supabase.from('course_modules').select('id, course_id').in('course_id', courseIds),
      supabase.from('lesson_progress').select('lesson_id, course_id').in('course_id', courseIds),
    ]);
    const moduleIds = (modules ?? []).map((m) => m.id);
    const { data: lessons } = moduleIds.length
      ? await supabase.from('lessons').select('id, module_id').in('module_id', moduleIds)
      : { data: [] };
    const courseOfModule = new Map((modules ?? []).map((m) => [m.id, m.course_id as string]));
    const lessonCount = new Map<string, number>();
    for (const l of lessons ?? []) {
      const courseId = courseOfModule.get(l.module_id);
      if (courseId) lessonCount.set(courseId, (lessonCount.get(courseId) ?? 0) + 1);
    }
    const doneCount = new Map<string, number>();
    for (const p of progress ?? []) {
      doneCount.set(p.course_id, (doneCount.get(p.course_id) ?? 0) + 1);
    }
    for (const c of courses.values()) {
      const total = lessonCount.get(c.id) ?? 0;
      const done = doneCount.get(c.id) ?? 0;
      if (done > 0 && total > 0) {
        progressByCourse.set(c.slug, Math.min(100, (done / total) * 100));
      }
    }
  }

  return (
    <div className="relative">
      <section className="relative pt-36 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-navy-950" />
        <FloatingOrbs />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <AnimatedSection>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
              Knowledge Base
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Resources to <span className="text-gold-gradient">Sharpen Your Edge</span>
            </h1>
            <p className="text-slate-400 text-xl max-w-xl mx-auto">
              Interactive courses, templates, and frameworks built for students serious about
              breaking into investment banking.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-20 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {RESOURCE_CATALOG.map((resource, i) => {
              const course = courses.get(resource.slug);
              if (course) {
                return (
                  <AnimatedSection key={resource.slug} delay={i * 0.08}>
                    <CourseCard
                      course={course}
                      progressPercent={progressByCourse.get(resource.slug) ?? null}
                    />
                  </AnimatedSection>
                );
              }
              return (
                <AnimatedSection key={resource.slug} delay={i * 0.08}>
                  <GlassCard className="h-full flex flex-col group">
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl bg-gold-400/10 flex items-center justify-center">
                        <CourseIcon name={resource.icon} className="w-5 h-5 text-gold-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full glass border border-white/10 text-slate-400">
                          {resource.tag}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-gold-400 transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">{resource.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed flex-1">
                      {resource.description}
                    </p>
                    <div className="mt-5 pt-4 border-t border-white/6 text-xs text-slate-500">
                      Coming soon
                    </div>
                  </GlassCard>
                </AnimatedSection>
              );
            })}
          </div>

          <AnimatedSection className="text-center mt-16" delay={0.2}>
            <div className="glass inline-block rounded-2xl border border-gold-400/15 px-8 py-6 max-w-lg">
              <div className="text-gold-400 font-semibold mb-2">More courses on the way</div>
              <p className="text-slate-400 text-sm">
                We&apos;re building out the full resource library — each section becomes a
                complete interactive course with practice tools and saved outputs.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
