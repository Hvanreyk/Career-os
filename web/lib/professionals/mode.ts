export type ProfessionalSourceMode = 'legacy' | 'normalized' | 'shadow';

export function getProfessionalSourceMode(
  value = process.env.PROFESSIONALS_SOURCE,
): ProfessionalSourceMode {
  if (!value) return 'legacy';
  if (value === 'legacy' || value === 'normalized' || value === 'shadow') return value;
  throw new Error('PROFESSIONALS_SOURCE must be legacy, normalized, or shadow');
}
