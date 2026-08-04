const SCALE_DIGITS = 6;
const SCALE = 10n ** BigInt(SCALE_DIGITS);

export type Fixed = bigint;

export function parseFixed(value: string | number): Fixed {
  const source = String(value).trim();
  const match = source.match(/^(-)?(\d+)(?:\.(\d+))?$/);
  if (!match) throw new Error(`Invalid decimal: ${source}`);
  const sign = match[1] ? -1n : 1n;
  const whole = BigInt(match[2] ?? '0');
  const fraction = (match[3] ?? '').padEnd(SCALE_DIGITS, '0').slice(0, SCALE_DIGITS);
  return sign * (whole * SCALE + BigInt(fraction || '0'));
}

export function formatFixed(value: Fixed, precision = SCALE_DIGITS): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / SCALE;
  const fraction = (absolute % SCALE).toString().padStart(SCALE_DIGITS, '0').slice(0, precision);
  const suffix = precision ? `.${fraction}` : '';
  return `${negative ? '-' : ''}${whole}${suffix}`;
}

function multiply(left: Fixed, right: Fixed): Fixed {
  return (left * right) / SCALE;
}

function divide(left: Fixed, right: Fixed): Fixed {
  if (right === 0n) throw new Error('Division by zero');
  return (left * SCALE) / right;
}

type Token = { type: 'number' | 'identifier' | 'operator' | 'left' | 'right'; value: string };

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const rest = expression.slice(index);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) { index += whitespace[0].length; continue; }
    const number = rest.match(/^\d+(?:\.\d+)?/);
    if (number) { tokens.push({ type: 'number', value: number[0] }); index += number[0].length; continue; }
    const identifier = rest.match(/^[A-Z][A-Z0-9_]*/);
    if (identifier) { tokens.push({ type: 'identifier', value: identifier[0] }); index += identifier[0].length; continue; }
    const character = rest[0];
    if (character && '+-*/'.includes(character)) tokens.push({ type: 'operator', value: character });
    else if (character === '(') tokens.push({ type: 'left', value: character });
    else if (character === ')') tokens.push({ type: 'right', value: character });
    else throw new Error(`Unsupported expression token near: ${rest.slice(0, 20)}`);
    index += 1;
  }
  return tokens;
}

export function evaluateFixed(expression: string, variables: Record<string, string>): Fixed {
  const tokens = tokenize(expression);
  let position = 0;
  function primary(): Fixed {
    const token = tokens[position];
    if (!token) throw new Error('Unexpected end of expression');
    if (token.type === 'operator' && token.value === '-') { position += 1; return -primary(); }
    if (token.type === 'number') { position += 1; return parseFixed(token.value); }
    if (token.type === 'identifier') {
      position += 1;
      const value = variables[token.value];
      if (value === undefined) throw new Error(`Unknown variable: ${token.value}`);
      return parseFixed(value);
    }
    if (token.type === 'left') {
      position += 1;
      const value = addition();
      if (tokens[position]?.type !== 'right') throw new Error('Missing closing parenthesis');
      position += 1;
      return value;
    }
    throw new Error(`Unexpected token: ${token.value}`);
  }
  function multiplication(): Fixed {
    let value = primary();
    while (tokens[position]?.type === 'operator' && ['*', '/'].includes(tokens[position]!.value)) {
      const operator = tokens[position]!.value;
      position += 1;
      const right = primary();
      value = operator === '*' ? multiply(value, right) : divide(value, right);
    }
    return value;
  }
  function addition(): Fixed {
    let value = multiplication();
    while (tokens[position]?.type === 'operator' && ['+', '-'].includes(tokens[position]!.value)) {
      const operator = tokens[position]!.value;
      position += 1;
      const right = multiplication();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }
  const result = addition();
  if (position !== tokens.length) throw new Error(`Unexpected token: ${tokens[position]?.value}`);
  return result;
}

export function roundFixed(value: Fixed, precision: number, mode: 'half_up' | 'floor' | 'ceiling'): Fixed {
  const factor = 10n ** BigInt(SCALE_DIGITS - precision);
  const quotient = value / factor;
  const remainder = value % factor;
  if (remainder === 0n) return value;
  if (mode === 'floor') return (value < 0n ? quotient - 1n : quotient) * factor;
  if (mode === 'ceiling') return (value > 0n ? quotient + 1n : quotient) * factor;
  const absoluteRemainder = remainder < 0n ? -remainder : remainder;
  const adjustment = absoluteRemainder * 2n >= factor ? (value < 0n ? -1n : 1n) : 0n;
  return (quotient + adjustment) * factor;
}

export function fixedCompare(left: Fixed, operator: string, right: Fixed): boolean {
  if (operator === '>') return left > right;
  if (operator === '>=') return left >= right;
  if (operator === '<') return left < right;
  if (operator === '<=') return left <= right;
  if (operator === '==') return left === right;
  if (operator === '!=') return left !== right;
  throw new Error(`Unsupported comparison operator: ${operator}`);
}
