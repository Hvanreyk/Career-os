import {
  BookOpen,
  Briefcase,
  FileText,
  Globe,
  Mail,
  Mic,
  PieChart,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';

// Courses store a lucide icon name (kebab-case) in courses.icon.
// Keep this map small and explicit — add entries as courses need them.
const ICONS: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  briefcase: Briefcase,
  'file-text': FileText,
  globe: Globe,
  mail: Mail,
  mic: Mic,
  'pie-chart': PieChart,
  'trending-up': TrendingUp,
  users: Users,
};

export function courseIcon(name: string): LucideIcon {
  return ICONS[name] ?? BookOpen;
}
