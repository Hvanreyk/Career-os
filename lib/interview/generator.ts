import { createHash } from 'node:crypto';
import { evaluateFixed, fixedCompare, formatFixed, parseFixed, roundFixed } from './decimal';
import type {
  GeneratedQuestionInstance,
  GeneratableTechnicalFamily,
  TechnicalItemFamily,
  VariantType,
} from './types';

function seedToUint32(seed: string): number {
  const digest = createHash('sha256').update(seed).digest();
  return digest.readUInt32BE(0) || 0x9e3779b9;
}

function randomGenerator(seed: string) {
  let state = seedToUint32(seed);
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function chooseParameter(
  parameter: TechnicalItemFamily['parameterSpec']['parameters'][number],
  random: () => number,
): string {
  if (parameter.type === 'enum') {
    const values = parameter.values ?? [];
    return values[Math.min(values.length - 1, Math.floor(random() * values.length))] ?? '';
  }
  const minimum = parseFixed(parameter.minimum ?? '0');
  const maximum = parseFixed(parameter.maximum ?? '0');
  const step = parseFixed(parameter.step ?? (parameter.type === 'integer' ? '1' : '0.01'));
  if (maximum < minimum || step <= 0n) throw new Error(`Invalid range for ${parameter.code}`);
  const count = Number((maximum - minimum) / step) + 1;
  const selected = minimum + BigInt(Math.min(count - 1, Math.floor(random() * count))) * step;
  const precision = parameter.type === 'integer' ? 0 : Math.min(6, (parameter.step ?? '0.01').split('.')[1]?.length ?? 2);
  return formatFixed(selected, precision);
}

function render(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (_match, code: string) => {
    const value = values[code];
    if (value === undefined) throw new Error(`Template references unknown value: ${code}`);
    return value;
  });
}

function validateConstraints(
  constraints: TechnicalItemFamily['parameterSpec']['constraints'],
  values: Record<string, string>,
) {
  for (const constraint of constraints) {
    const match = constraint.expression.match(/^(.+?)\s*(>=|<=|==|!=|>|<)\s*(.+)$/);
    if (!match) throw new Error(`Invalid constraint expression: ${constraint.expression}`);
    const left = evaluateFixed(match[1]!, values);
    const right = evaluateFixed(match[3]!, values);
    if (!fixedCompare(left, match[2]!, right)) throw new Error(`${constraint.code}: ${constraint.errorMessage}`);
  }
}

export function generateQuestionInstance(
  family: GeneratableTechnicalFamily,
  seed: string,
  variant: VariantType = 'standard',
): GeneratedQuestionInstance {
  if (!family.variantCoverage.includes(variant)) throw new Error(`Variant ${variant} is not approved for ${family.slug}`);
  const random = randomGenerator(`${family.id}:${family.parameterSpec.seedVersion}:${seed}:${variant}`);
  const parameters: Record<string, string> = {};
  for (const parameter of family.parameterSpec.parameters) parameters[parameter.code] = chooseParameter(parameter, random);
  const override = family.parameterSpec.transformationRules.find((rule) => rule.variant === variant)?.requiredParameterOverrides;
  for (const [code, value] of Object.entries(override ?? {})) parameters[code] = String(value);
  const derivedValues: Record<string, string> = {};
  for (const derived of family.parameterSpec.derivedValues) {
    const value = evaluateFixed(derived.expression, { ...parameters, ...derivedValues });
    derivedValues[derived.code] = formatFixed(roundFixed(value, derived.precision, derived.rounding), derived.precision);
  }
  const values = { ...parameters, ...derivedValues };
  validateConstraints(family.parameterSpec.constraints, values);
  const transform = family.parameterSpec.transformationRules.find((rule) => rule.variant === variant);
  const prompt = render(transform?.promptTemplate ?? family.questionVersion.promptTemplate, values);
  const questionHash = createHash('sha256').update(JSON.stringify({
    familyId: family.id,
    questionVersion: family.questionVersion.version,
    rubricVersion: family.rubricVersion.version,
    seed,
    variant,
    parameters,
    derivedValues,
    prompt,
  })).digest('hex');
  return {
    familyId: family.id,
    questionVersion: family.questionVersion.version,
    rubricVersion: family.rubricVersion.version,
    seed,
    seedVersion: family.parameterSpec.seedVersion,
    variant,
    prompt,
    parameters,
    derivedValues,
    questionHash,
  };
}

export function validateGeneratedFamily(family: GeneratableTechnicalFamily, count = 1000): string[] {
  const errors: string[] = [];
  for (const variant of family.variantCoverage) {
    for (let index = 0; index < count; index += 1) {
      try { generateQuestionInstance(family, `validation-${index}`, variant); }
      catch (error) { errors.push(`${variant}/${index}: ${error instanceof Error ? error.message : String(error)}`); }
      if (errors.length >= 100) return errors;
    }
  }
  return errors;
}
