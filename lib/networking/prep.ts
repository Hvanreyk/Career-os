import type { ContactSeniority } from './types';

// ============================================================
// Coffee-chat prep — role-calibrated question banks and a prep
// sheet scaffold. What you ask an analyst differs from what you
// ask an MD; asking an MD about Excel shortcuts (or an analyst
// about firm strategy) wastes the conversation. Editorial content,
// deterministic output. Pure module — no I/O.
// ============================================================

export interface PrepQuestion {
  question: string;
  why: string;
}

const JUNIOR_QUESTIONS: PrepQuestion[] = [
  {
    question: 'What does a typical week look like for you right now?',
    why: 'Grounds the conversation in reality and shows you care about the actual job.',
  },
  {
    question: 'What surprised you most moving from university into the team?',
    why: 'Analysts remember recruiting vividly — their transition lessons are directly usable.',
  },
  {
    question: 'When you applied, what do you think set successful candidates apart?',
    why: 'First-hand, recent recruiting signal for the exact process you are about to enter.',
  },
  {
    question: 'How did you prepare for interviews once you had the first-round invite?',
    why: 'Turns the chat into concrete preparation guidance you can act on this week.',
  },
  {
    question: 'What would you do differently if you were starting your penultimate year again?',
    why: 'Invites honest advice without asking them to commit to anything.',
  },
];

const MID_QUESTIONS: PrepQuestion[] = [
  {
    question: 'How does your team divide work between analysts, associates and VPs on a live deal?',
    why: 'Shows you think about how the team actually operates, not just how to get in.',
  },
  {
    question: 'What distinguishes the junior bankers you rate most highly?',
    why: 'VPs assess juniors daily — their answer tells you what to demonstrate.',
  },
  {
    question: 'How has the deal flow in your sector shifted over the past year?',
    why: 'Lets you show commercial awareness and gives you material for interviews.',
  },
  {
    question: 'What do you wish more students understood about this job before applying?',
    why: 'Opens space for candid guidance beyond the recruiting brochure.',
  },
];

const SENIOR_QUESTIONS: PrepQuestion[] = [
  {
    question: 'How did you choose the path that led you to where you are now?',
    why: 'Senior bankers respond to genuine interest in judgement and career shape, not process trivia.',
  },
  {
    question: 'What kinds of deals is the team most focused on at the moment?',
    why: 'Signals commercial curiosity at the level an MD actually thinks about.',
  },
  {
    question: 'When you sponsor a junior hire, what convinces you?',
    why: 'MDs influence offers — understanding their bar matters more than any checklist.',
  },
];

const RECRUITER_QUESTIONS: PrepQuestion[] = [
  {
    question: 'How is this year’s process structured, and what dates matter most?',
    why: 'Recruiters own the process — get the logistics from the source.',
  },
  {
    question: 'What makes an application stand out at the screening stage?',
    why: 'They read hundreds of applications; their screening lens is the one that counts first.',
  },
  {
    question: 'How do you weigh penultimate-year programs against direct graduate applications?',
    why: 'Helps you sequence your own applications realistically.',
  },
];

/**
 * Returns the question bank calibrated to a contact's seniority.
 */
export function prepQuestionsFor(seniority: ContactSeniority): PrepQuestion[] {
  switch (seniority) {
    case 'student':
    case 'analyst':
    case 'associate':
      return JUNIOR_QUESTIONS;
    case 'vp':
    case 'director':
      return MID_QUESTIONS;
    case 'md':
      return SENIOR_QUESTIONS;
    case 'recruiter':
      return RECRUITER_QUESTIONS;
    default:
      return JUNIOR_QUESTIONS;
  }
}

export interface PrepSheet {
  research_notes: string;
  questions: string[];
  my_ask: string;
}

/**
 * Builds an empty prep sheet seeded with role-appropriate questions.
 * The student edits and owns the result; nothing here is mandatory.
 */
export function buildPrepSheet(seniority: ContactSeniority): PrepSheet {
  return {
    research_notes: '',
    questions: prepQuestionsFor(seniority).slice(0, 4).map((q) => q.question),
    my_ask: '',
  };
}
