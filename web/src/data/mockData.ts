import type { PostTypeSchema, SourceField, SourceRow } from '../types';

const FIRST_NAMES = [
  'James', 'Maria', 'Robert', 'Linda', 'David', 'Susan', 'Michael', 'Karen',
  'William', 'Patricia', 'Richard', 'Barbara', 'Joseph', 'Nancy', 'Thomas',
  'Lisa', 'Charles', 'Betty', 'Daniel', 'Sandra', 'Mark', 'Ashley', 'Paul',
  'Kimberly', 'Steven', 'Emily', 'Andrew', 'Donna', 'Kenneth', 'Michelle',
  'George', 'Carol', 'Edward',
];

const LAST_NAMES = [
  'Kirk', 'Alvarez', 'Chen', 'Nakamura', 'Okafor', 'Brennan', 'Petrova',
  'Silva', 'Kowalski', 'Haddad', 'Moreau', 'Lindqvist', 'Reyes', 'Novak',
  'Fitzgerald', 'Yamada', 'Costa', 'Brandt', 'Osei', 'Delgado', 'Sørensen',
  'Ibrahim', 'Marsh', 'Tanaka', 'Whitfield', 'Rossi', 'Carrasco', 'Larsen',
  'Abubakar', 'Fontaine', 'Wren', 'Doyle', 'Santos',
];

const CITIES: [city: string, state: string][] = [
  ['Riverside', 'IA'], ['Bellwood', 'OH'], ['Maple Grove', 'MN'],
  ['Cedar Falls', 'IA'], ['Sunset Hills', 'MO'], ['Harbor Springs', 'MI'],
  ['Stonebridge', 'CO'], ['Fairview', 'TX'], ['Lakeside', 'OR'],
  ['Greenfield', 'IN'], ['Ashton', 'WI'], ['Millbrook', 'NY'],
];

function hashSeed(i: number, salt: number): number {
  return (i * 2654435761 + salt) % 2147483647;
}

function pick<T>(arr: T[], i: number, salt: number): T {
  return arr[hashSeed(i, salt) % arr.length];
}

function phoneFor(i: number): string {
  const exchange = 100 + (hashSeed(i, 7) % 900);
  const line = 1000 + (hashSeed(i, 13) % 9000);
  return `555-${exchange}-${line}`;
}

export const SOURCE_FIELDS: SourceField[] = [
  { id: 'src-first', name: 'first', sampleValue: 'James' },
  { id: 'src-last', name: 'last', sampleValue: 'Kirk' },
  { id: 'src-office', name: 'office', sampleValue: '555-123-4567' },
  { id: 'src-email', name: 'email', sampleValue: 'jkirk@enterprise.com' },
  { id: 'src-address', name: 'address', sampleValue: '42 Main St, Riverside, IA' },
  { id: 'src-birthday', name: 'birthday', sampleValue: '1966-03-22' },
  { id: 'src-ssn', name: 'ssn', sampleValue: '###-##-####' },
  { id: 'src-hire-date', name: 'hire date', sampleValue: '2021-06-01' },
];

export const SOURCE_ROWS: SourceRow[] = Array.from({ length: 34 }, (_, i) => {
  const first = i === 0 ? 'James' : pick(FIRST_NAMES, i, 1);
  const last = i === 0 ? 'Kirk' : pick(LAST_NAMES, i, 2);
  const [city, state] = i === 0 ? ['Riverside', 'IA'] : pick(CITIES, i, 3);
  const streetNum = 10 + (hashSeed(i, 5) % 990);
  return {
    'src-first': first,
    'src-last': last,
    'src-office': phoneFor(i),
    'src-email': `${first[0].toLowerCase()}${last.toLowerCase()}@enterprise.com`,
    'src-address': `${streetNum} Main St, ${city}, ${state}`,
    'src-birthday': `19${60 + (hashSeed(i, 9) % 35)}-0${1 + (hashSeed(i, 11) % 9)}-1${hashSeed(i, 17) % 9}`,
    'src-ssn': '###-##-####',
    'src-hire-date': `20${10 + (hashSeed(i, 19) % 14)}-0${1 + (hashSeed(i, 23) % 9)}-0${1 + (hashSeed(i, 29) % 9)}`,
  };
});

export const EMPLOYEE_POST_TYPE: PostTypeSchema = {
  id: 'employee',
  label: 'Employee Directory',
  templates: ['Employee Profile', 'Directory Card', 'Compact List Row'],
  fields: [
    { id: 'tgt-name', label: 'Name', group: 'custom', aliases: ['name', 'full name', 'fullname'], required: true },
    { id: 'tgt-phone', label: 'Phone Number', group: 'custom', aliases: ['phone', 'phone number', 'office', 'tel'] },
    { id: 'tgt-email', label: 'Email', group: 'custom', aliases: ['email', 'e-mail'] },
    { id: 'tgt-city', label: 'City', group: 'custom', aliases: ['city', 'town'] },
    { id: 'tgt-state', label: 'State', group: 'custom', aliases: ['state', 'province'] },
    { id: 'tgt-post-date', label: 'Post Date', group: 'standard', aliases: ['post date', 'date', 'published'] },
    { id: 'tgt-featured-image', label: 'Featured Image', group: 'standard', aliases: ['image', 'photo', 'featured image'] },
    { id: 'tgt-post-author', label: 'Post Author', group: 'standard', aliases: ['author', 'post author'] },
  ],
};

export const POST_TYPES: PostTypeSchema[] = [
  EMPLOYEE_POST_TYPE,
  {
    id: 'location',
    label: 'Branch Location',
    templates: ['Location Detail', 'Map Pin Card'],
    fields: [
      { id: 'loc-name', label: 'Branch Name', group: 'custom', aliases: ['name', 'branch'] },
      { id: 'loc-address', label: 'Street Address', group: 'custom', aliases: ['address', 'street'] },
      { id: 'loc-city', label: 'City', group: 'custom', aliases: ['city'] },
      { id: 'loc-phone', label: 'Phone', group: 'custom', aliases: ['phone', 'telephone'] },
      { id: 'loc-url', label: 'Website URL', group: 'custom', aliases: ['url', 'website'] },
      { id: 'loc-post-date', label: 'Post Date', group: 'standard', aliases: ['post date', 'date'] },
      { id: 'loc-post-author', label: 'Post Author', group: 'standard', aliases: ['author'] },
    ],
  },
];
