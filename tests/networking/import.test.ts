import { describe, expect, it } from 'vitest';
import { buildImportPreview, csvCell, parseCsv, toCsv } from '../../lib/networking/import.js';

describe('parseCsv', () => {
  it('parses quoted fields with commas and escaped quotes', () => {
    const { headers, rows } = parseCsv('name,notes\n"Doe, Jane","Said ""hello"""\n');
    expect(headers).toEqual(['name', 'notes']);
    expect(rows[0]).toEqual(['Doe, Jane', 'Said "hello"']);
  });

  it('throws on an empty file', () => {
    expect(() => parseCsv('')).toThrow(/no rows/);
  });

  it('throws when the row limit is exceeded', () => {
    const rows = Array.from({ length: 502 }, (_, i) => `Person ${i}`).join('\n');
    expect(() => parseCsv(`name\n${rows}`)).toThrow(/limited to 500 rows/);
  });

  it('throws on an unterminated quoted field', () => {
    expect(() => parseCsv('name,notes\nJane,"unfinished')).toThrow(/unterminated quoted field/);
  });
});

describe('buildImportPreview', () => {
  it('maps aliased headers and produces a candidate', () => {
    const csv = 'Full Name,Company,Email\nJane Doe,Macquarie,jane@example.com\n';
    const preview = buildImportPreview(csv, []);
    expect(preview.candidates).toHaveLength(1);
    expect(preview.candidates[0]).toMatchObject({ full_name: 'Jane Doe', firm: 'Macquarie', email_normalized: 'jane@example.com' });
    expect(preview.unmappedHeaders).toHaveLength(0);
  });

  it('requires a name column', () => {
    expect(() => buildImportPreview('firm\nMacquarie\n', [])).toThrow(/name column/);
  });

  it('classifies duplicates by email over linkedin over name+firm', () => {
    const csv = [
      'name,firm,email',
      'Jane Doe,Macquarie,jane@example.com',
    ].join('\n');
    const preview = buildImportPreview(csv, [{
      id: 'existing-1', email_normalized: 'jane@example.com', linkedin_normalized: null,
      full_name: 'Jane Doe', firm: 'Macquarie',
    }]);
    expect(preview.candidates).toHaveLength(0);
    expect(preview.duplicates).toEqual([{ rowNumber: 2, full_name: 'Jane Doe', matchType: 'email', existingContactId: 'existing-1' }]);
  });

  it('collapses duplicate rows within the same file', () => {
    const csv = [
      'name,firm,email',
      'Jane Doe,Macquarie,jane@example.com',
      'Jane Doe,Macquarie,jane@example.com',
    ].join('\n');
    const preview = buildImportPreview(csv, []);
    expect(preview.candidates).toHaveLength(1);
  });

  it('collapses in-file rows sharing only a LinkedIn URL', () => {
    const csv = [
      'name,firm,email,linkedin',
      'Jane Doe,Macquarie,jane@example.com,linkedin.com/in/jane-doe',
      'Jane D,UBS,jane.other@example.com,linkedin.com/in/jane-doe',
    ].join('\n');
    const preview = buildImportPreview(csv, []);
    expect(preview.candidates).toHaveLength(1);
  });

  it('collapses in-file rows sharing only a normalized name+firm', () => {
    const csv = [
      'name,firm,email',
      'Jane Doe,Macquarie,jane@example.com',
      'Jane Doe,Macquarie,jane.alt@example.com',
    ].join('\n');
    const preview = buildImportPreview(csv, []);
    expect(preview.candidates).toHaveLength(1);
  });

  it('reports a row error without failing the whole import', () => {
    const csv = [
      'name,firm',
      'Jane Doe,Macquarie',
      ',NoName Inc',
    ].join('\n');
    const preview = buildImportPreview(csv, []);
    expect(preview.candidates).toHaveLength(1);
    expect(preview.errors).toHaveLength(1);
    expect(preview.errors[0].rowNumber).toBe(3);
  });

  it('drops a malformed email but keeps the row', () => {
    const csv = 'name,email\nJane Doe,not-an-email\n';
    const preview = buildImportPreview(csv, []);
    expect(preview.candidates[0].email).toBe('');
    expect(preview.candidates[0].email_normalized).toBeNull();
  });
});

describe('csvCell / toCsv', () => {
  it('neutralises formula-injection prefixes', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('+1234')).toBe("'+1234");
    expect(csvCell('safe value')).toBe('safe value');
  });

  it('quotes cells containing commas or quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('serialises rows to CSV', () => {
    expect(toCsv(['a', 'b'], [['1', '2']])).toBe('a,b\n1,2');
  });
});
