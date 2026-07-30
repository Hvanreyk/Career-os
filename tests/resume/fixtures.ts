import type { ResumeDocument } from '../../lib/resume/document.js';

export const sampleDocument: ResumeDocument = {
  contact: {
    full_name: 'Alex Nguyen',
    email: 'alex@uni.edu.au',
    phone: '+61 400 000 000',
    linkedin_url: 'linkedin.com/in/alexnguyen',
    location: 'Sydney, NSW',
  },
  sections: [
    {
      kind: 'education',
      heading: 'Education',
      entries: [{
        org: 'UNSW',
        role_title: 'Bachelor of Commerce (Finance)',
        location: 'Sydney',
        date_range: '2022 – 2025',
        bullets: ['Distinction average', "Dean's List 2023"],
      }],
      loose_bullets: [],
    },
    {
      kind: 'experience',
      heading: 'Professional Experience',
      entries: [{
        org: 'Macquarie Group',
        role_title: 'Summer Analyst',
        location: 'Sydney',
        date_range: 'Nov 2024 – Feb 2025',
        bullets: ['Built a three-statement model', 'Drafted committee papers'],
      }],
      loose_bullets: [],
    },
    {
      kind: 'skills',
      heading: 'Skills & Interests',
      entries: [],
      loose_bullets: ['Excel, PowerPoint, Python', 'AFL, chess'],
    },
  ],
};
