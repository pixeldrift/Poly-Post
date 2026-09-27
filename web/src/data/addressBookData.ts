import type { Scenario, SourceField, SourceRow, TargetSchema } from '../types';

// Address Book A: the messy, real-world shape most contact exports actually
// come in — separate name parts, one free-text address line, and phone
// numbers formatted however whoever typed them felt like that day.

const FIRST_NAMES = [
  'jane', 'MARCUS', 'Priya', 'oliver', 'SOFIA', 'Ahmed', 'lucy', 'DEVON',
  'Naomi', 'felix', 'GRACE', 'Iker', 'hannah', 'TOBIAS', 'Amara', 'ren',
  'CLARA', 'Mateo', 'ingrid', 'DESHAWN',
];

const LAST_NAMES = [
  'doe', 'REYES', 'Patel', 'nilsson', 'CASTRO', 'Hassan', 'byrne', 'OKAFOR',
  'Lindgren', 'moreno', 'SCHULTZ', 'Aoki', 'walsh', 'DUBOIS', 'Nakashima',
  'park', 'FERREIRA', 'Kowalczyk', 'ostrom', 'BRIGGS',
];

const PLACES: [street: string, city: string, state: string, zip: string][] = [
  ['128 Elm St', 'Springfield', 'IL', '62704'],
  ['47 Birch Ave', 'Georgetown', 'TX', '78626'],
  ['902 Harbor Rd', 'Newport', 'RI', '02840'],
  ['15 Willow Ln', 'Bend', 'OR', '97701'],
  ['630 Prairie Dr', 'Lawrence', 'KS', '66044'],
  ['221 Cedar Ct', 'Asheville', 'NC', '28801'],
  ['74 Foxglove Way', 'Duluth', 'MN', '55802'],
  ['1180 Canyon Blvd', 'Flagstaff', 'AZ', '86001'],
];

function hashSeed(i: number, salt: number): number {
  return (i * 2654435761 + salt) % 2147483647;
}

function pick<T>(arr: T[], i: number, salt: number): T {
  return arr[hashSeed(i, salt) % arr.length];
}

function applyCasePattern(value: string, pattern: number): string {
  if (pattern === 0) return value.toLowerCase();
  if (pattern === 1) return value.toUpperCase();
  return value[0].toUpperCase() + value.slice(1).toLowerCase();
}

function phoneVariant(i: number, digits: string): string {
  const area = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  const line = digits.slice(6);
  switch (i % 4) {
    case 0:
      return `${area}-${exchange}-${line}`;
    case 1:
      return `(${area}) ${exchange}-${line}`;
    case 2:
      return `${area}.${exchange}.${line}`;
    default:
      return `${area}${exchange}${line}`;
  }
}

const SOURCE_FIELDS: SourceField[] = [
  { id: 'ab-src-first', name: 'First', sampleValue: 'jane' },
  { id: 'ab-src-last', name: 'Last', sampleValue: 'DOE' },
  { id: 'ab-src-address', name: 'Address', sampleValue: '128 Elm St, Springfield, IL, 62704' },
  { id: 'ab-src-phone', name: 'Phone', sampleValue: '555.234.1189' },
  { id: 'ab-src-email', name: 'Email', sampleValue: 'Jane.Doe@EXAMPLE.com' },
  { id: 'ab-src-notes', name: 'Notes', sampleValue: 'Prefers email contact' },
];

const NOTES = [
  'Prefers email contact', 'Met at spring conference', 'Referred by a client',
  'Holiday card list', 'Follow up next quarter', '', 'VIP — priority support',
  'Moved recently, confirm address',
];

const SOURCE_ROWS: SourceRow[] = Array.from({ length: 22 }, (_, i) => {
  const rawFirst = i === 0 ? 'jane' : pick(FIRST_NAMES, i, 1);
  const rawLast = i === 0 ? 'DOE' : pick(LAST_NAMES, i, 2);
  const casePattern = hashSeed(i, 4) % 3;
  const first = applyCasePattern(rawFirst, i === 0 ? 0 : casePattern);
  const last = applyCasePattern(rawLast, i === 0 ? 1 : (casePattern + 1) % 3);
  const [street, city, state, zip] = i === 0 ? PLACES[0] : pick(PLACES, i, 5);
  const digits = `555${String(200 + (hashSeed(i, 7) % 700)).padStart(3, '0')}${String(1000 + (hashSeed(i, 13) % 9000)).padStart(4, '0')}`;
  const emailCasePattern = hashSeed(i, 9) % 3;
  const emailLocal = applyCasePattern(`${rawFirst}.${rawLast}`, emailCasePattern);
  const emailDomain = emailCasePattern === 1 ? 'EXAMPLE.com' : 'example.com';

  return {
    'ab-src-first': first,
    'ab-src-last': last,
    'ab-src-address': `${street}, ${city}, ${state}, ${zip}`,
    'ab-src-phone': phoneVariant(i, digits),
    'ab-src-email': `${emailLocal}@${emailDomain}`,
    'ab-src-notes': i === 0 ? 'Prefers email contact' : pick(NOTES, i, 17),
  };
});

const ADDRESS_BOOK_B_TARGET: TargetSchema = {
  id: 'address-book-b',
  label: 'Address Book B (standardized)',
  outputKind: 'csv',
  fields: [
    { id: 'ab-tgt-fullname', label: 'Full Name', aliases: ['full name', 'fullname', 'name'], formatHint: 'titlecase', required: true },
    { id: 'ab-tgt-street', label: 'Street', aliases: ['street'] },
    { id: 'ab-tgt-city', label: 'City', aliases: ['city', 'town'] },
    { id: 'ab-tgt-state', label: 'State', aliases: ['state', 'province'] },
    { id: 'ab-tgt-zip', label: 'Zip', aliases: ['zip', 'zipcode', 'postalcode', 'postcode'] },
    { id: 'ab-tgt-phone', label: 'Phone', aliases: ['phone', 'telephone', 'mobile'], formatHint: 'phone' },
    { id: 'ab-tgt-email', label: 'Email', aliases: ['email', 'e-mail'], formatHint: 'lowercase' },
  ],
};

export const ADDRESS_BOOK_SCENARIO: Scenario = {
  id: 'address-book-csv',
  label: 'Address Book CSV Converter',
  description:
    'Convert one address book export into another: split/merge names and addresses, and standardize phone and email formatting along the way.',
  sourceFileName: 'address-book-a.csv',
  sourceFields: SOURCE_FIELDS,
  sourceRows: SOURCE_ROWS,
  targetSchemas: [ADDRESS_BOOK_B_TARGET],
};
