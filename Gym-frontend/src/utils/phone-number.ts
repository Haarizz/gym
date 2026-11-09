// Country-code phone helpers, shared by every phone field (components/shared/PhoneInput)
// and the public lead / walk-in forms. The user types only the national number; the dial
// code comes from the country picker. The public forms send "+{dial}{digits}"; the staff
// forms store "+{dial} {digits}" (one space, so it reads well and still matches searches).

export interface DialCountry {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  /** National number length (without the trunk 0). */
  maxDigits: number;
  /** Display grouping, e.g. [2, 3, 4] → "50 123 4567". */
  groups: number[];
  placeholder: string;
  /** Stricter check for countries where we know the mobile format. */
  mobilePattern?: RegExp;
  mobileHint?: string;
  /** Other names people search for, e.g. "UAE", "KSA", "UK", "USA". */
  aliases?: string;
}

/** The countries we know the national format of — listed first in every picker. */
const DETAILED_COUNTRIES: DialCountry[] = [
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪', maxDigits: 9, groups: [2, 3, 4], placeholder: '50 123 4567',
    mobilePattern: /^5\d{8}$/, mobileHint: 'Enter a valid UAE mobile number, e.g. 50\u00a0123\u00a04567' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦', maxDigits: 9, groups: [2, 3, 4], placeholder: '50 123 4567' },
  { iso: 'QA', name: 'Qatar', dial: '974', flag: '🇶🇦', maxDigits: 8, groups: [4, 4], placeholder: '3312 3456' },
  { iso: 'KW', name: 'Kuwait', dial: '965', flag: '🇰🇼', maxDigits: 8, groups: [4, 4], placeholder: '5012 3456' },
  { iso: 'BH', name: 'Bahrain', dial: '973', flag: '🇧🇭', maxDigits: 8, groups: [4, 4], placeholder: '3600 1234' },
  { iso: 'OM', name: 'Oman', dial: '968', flag: '🇴🇲', maxDigits: 8, groups: [4, 4], placeholder: '9212 3456' },
  { iso: 'IN', name: 'India', dial: '91', flag: '🇮🇳', maxDigits: 10, groups: [5, 5], placeholder: '98765 43210' },
  { iso: 'PK', name: 'Pakistan', dial: '92', flag: '🇵🇰', maxDigits: 10, groups: [3, 7], placeholder: '301 2345678' },
  { iso: 'PH', name: 'Philippines', dial: '63', flag: '🇵🇭', maxDigits: 10, groups: [3, 3, 4], placeholder: '917 123 4567' },
  { iso: 'EG', name: 'Egypt', dial: '20', flag: '🇪🇬', maxDigits: 10, groups: [2, 4, 4], placeholder: '10 1234 5678' },
  { iso: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧', maxDigits: 10, groups: [4, 6], placeholder: '7400 123456' },
  { iso: 'US', name: 'United States', dial: '1', flag: '🇺🇸', maxDigits: 10, groups: [3, 3, 4], placeholder: '201 555 0123' },
];

const ALIASES: Record<string, string> = {
  AE: 'UAE Emirates Dubai Abu Dhabi', SA: 'KSA', GB: 'UK Britain England', US: 'USA America',
  KR: 'Korea', KP: 'Korea DPRK', CD: 'DRC', CI: 'Ivory Coast', TR: 'Turkey', CZ: 'Czech Republic',
  MK: 'Macedonia', SZ: 'Swaziland', MM: 'Burma', TL: 'East Timor', CV: 'Cabo Verde', NL: 'Holland',
};

// [ISO, name, dial code] for every other country/territory with its own calling code. Codes
// shared with a bigger country (+1 Canada/Caribbean use their full NANP code where they have one).
const OTHER_COUNTRIES: [string, string, string][] = [
  ['AF', 'Afghanistan', '93'], ['AL', 'Albania', '355'], ['DZ', 'Algeria', '213'], ['AS', 'American Samoa', '1684'],
  ['AD', 'Andorra', '376'], ['AO', 'Angola', '244'], ['AI', 'Anguilla', '1264'], ['AG', 'Antigua and Barbuda', '1268'],
  ['AR', 'Argentina', '54'], ['AM', 'Armenia', '374'], ['AW', 'Aruba', '297'], ['AU', 'Australia', '61'],
  ['AT', 'Austria', '43'], ['AZ', 'Azerbaijan', '994'], ['BS', 'Bahamas', '1242'], ['BD', 'Bangladesh', '880'],
  ['BB', 'Barbados', '1246'], ['BY', 'Belarus', '375'], ['BE', 'Belgium', '32'], ['BZ', 'Belize', '501'],
  ['BJ', 'Benin', '229'], ['BM', 'Bermuda', '1441'], ['BT', 'Bhutan', '975'], ['BO', 'Bolivia', '591'],
  ['BA', 'Bosnia and Herzegovina', '387'], ['BW', 'Botswana', '267'], ['BR', 'Brazil', '55'],
  ['VG', 'British Virgin Islands', '1284'], ['BN', 'Brunei', '673'], ['BG', 'Bulgaria', '359'],
  ['BF', 'Burkina Faso', '226'], ['BI', 'Burundi', '257'], ['KH', 'Cambodia', '855'], ['CM', 'Cameroon', '237'],
  ['CA', 'Canada', '1'], ['CV', 'Cape Verde', '238'], ['KY', 'Cayman Islands', '1345'],
  ['CF', 'Central African Republic', '236'], ['TD', 'Chad', '235'], ['CL', 'Chile', '56'], ['CN', 'China', '86'],
  ['CO', 'Colombia', '57'], ['KM', 'Comoros', '269'], ['CG', 'Congo', '242'], ['CD', 'Congo (DRC)', '243'],
  ['CK', 'Cook Islands', '682'], ['CR', 'Costa Rica', '506'], ['CI', "Côte d'Ivoire", '225'], ['HR', 'Croatia', '385'],
  ['CU', 'Cuba', '53'], ['CW', 'Curaçao', '599'], ['CY', 'Cyprus', '357'], ['CZ', 'Czechia', '420'],
  ['DK', 'Denmark', '45'], ['DJ', 'Djibouti', '253'], ['DM', 'Dominica', '1767'], ['DO', 'Dominican Republic', '1809'],
  ['EC', 'Ecuador', '593'], ['SV', 'El Salvador', '503'], ['GQ', 'Equatorial Guinea', '240'], ['ER', 'Eritrea', '291'],
  ['EE', 'Estonia', '372'], ['SZ', 'Eswatini', '268'], ['ET', 'Ethiopia', '251'], ['FK', 'Falkland Islands', '500'],
  ['FO', 'Faroe Islands', '298'], ['FJ', 'Fiji', '679'], ['FI', 'Finland', '358'], ['FR', 'France', '33'],
  ['GF', 'French Guiana', '594'], ['PF', 'French Polynesia', '689'], ['GA', 'Gabon', '241'], ['GM', 'Gambia', '220'],
  ['GE', 'Georgia', '995'], ['DE', 'Germany', '49'], ['GH', 'Ghana', '233'], ['GI', 'Gibraltar', '350'],
  ['GR', 'Greece', '30'], ['GL', 'Greenland', '299'], ['GD', 'Grenada', '1473'], ['GP', 'Guadeloupe', '590'],
  ['GU', 'Guam', '1671'], ['GT', 'Guatemala', '502'], ['GN', 'Guinea', '224'], ['GW', 'Guinea-Bissau', '245'],
  ['GY', 'Guyana', '592'], ['HT', 'Haiti', '509'], ['HN', 'Honduras', '504'], ['HK', 'Hong Kong', '852'],
  ['HU', 'Hungary', '36'], ['IS', 'Iceland', '354'], ['ID', 'Indonesia', '62'], ['IR', 'Iran', '98'],
  ['IQ', 'Iraq', '964'], ['IE', 'Ireland', '353'], ['IL', 'Israel', '972'], ['IT', 'Italy', '39'],
  ['JM', 'Jamaica', '1876'], ['JP', 'Japan', '81'], ['JO', 'Jordan', '962'], ['KZ', 'Kazakhstan', '7'],
  ['KE', 'Kenya', '254'], ['KI', 'Kiribati', '686'], ['XK', 'Kosovo', '383'], ['KG', 'Kyrgyzstan', '996'],
  ['LA', 'Laos', '856'], ['LV', 'Latvia', '371'], ['LB', 'Lebanon', '961'], ['LS', 'Lesotho', '266'],
  ['LR', 'Liberia', '231'], ['LY', 'Libya', '218'], ['LI', 'Liechtenstein', '423'], ['LT', 'Lithuania', '370'],
  ['LU', 'Luxembourg', '352'], ['MO', 'Macao', '853'], ['MG', 'Madagascar', '261'], ['MW', 'Malawi', '265'],
  ['MY', 'Malaysia', '60'], ['MV', 'Maldives', '960'], ['ML', 'Mali', '223'], ['MT', 'Malta', '356'],
  ['MH', 'Marshall Islands', '692'], ['MQ', 'Martinique', '596'], ['MR', 'Mauritania', '222'], ['MU', 'Mauritius', '230'],
  ['YT', 'Mayotte', '262'], ['MX', 'Mexico', '52'], ['FM', 'Micronesia', '691'], ['MD', 'Moldova', '373'],
  ['MC', 'Monaco', '377'], ['MN', 'Mongolia', '976'], ['ME', 'Montenegro', '382'], ['MS', 'Montserrat', '1664'],
  ['MA', 'Morocco', '212'], ['MZ', 'Mozambique', '258'], ['MM', 'Myanmar', '95'], ['NA', 'Namibia', '264'],
  ['NR', 'Nauru', '674'], ['NP', 'Nepal', '977'], ['NL', 'Netherlands', '31'], ['NC', 'New Caledonia', '687'],
  ['NZ', 'New Zealand', '64'], ['NI', 'Nicaragua', '505'], ['NE', 'Niger', '227'], ['NG', 'Nigeria', '234'],
  ['NU', 'Niue', '683'], ['KP', 'North Korea', '850'], ['MK', 'North Macedonia', '389'],
  ['MP', 'Northern Mariana Islands', '1670'], ['NO', 'Norway', '47'], ['PW', 'Palau', '680'], ['PS', 'Palestine', '970'],
  ['PA', 'Panama', '507'], ['PG', 'Papua New Guinea', '675'], ['PY', 'Paraguay', '595'], ['PE', 'Peru', '51'],
  ['PL', 'Poland', '48'], ['PT', 'Portugal', '351'], ['PR', 'Puerto Rico', '1787'], ['RE', 'Réunion', '262'],
  ['RO', 'Romania', '40'], ['RU', 'Russia', '7'], ['RW', 'Rwanda', '250'], ['KN', 'Saint Kitts and Nevis', '1869'],
  ['LC', 'Saint Lucia', '1758'], ['VC', 'Saint Vincent and the Grenadines', '1784'], ['WS', 'Samoa', '685'],
  ['SM', 'San Marino', '378'], ['ST', 'São Tomé and Príncipe', '239'], ['SN', 'Senegal', '221'], ['RS', 'Serbia', '381'],
  ['SC', 'Seychelles', '248'], ['SL', 'Sierra Leone', '232'], ['SG', 'Singapore', '65'], ['SX', 'Sint Maarten', '1721'],
  ['SK', 'Slovakia', '421'], ['SI', 'Slovenia', '386'], ['SB', 'Solomon Islands', '677'], ['SO', 'Somalia', '252'],
  ['ZA', 'South Africa', '27'], ['KR', 'South Korea', '82'], ['SS', 'South Sudan', '211'], ['ES', 'Spain', '34'],
  ['LK', 'Sri Lanka', '94'], ['SD', 'Sudan', '249'], ['SR', 'Suriname', '597'], ['SE', 'Sweden', '46'],
  ['CH', 'Switzerland', '41'], ['SY', 'Syria', '963'], ['TW', 'Taiwan', '886'], ['TJ', 'Tajikistan', '992'],
  ['TZ', 'Tanzania', '255'], ['TH', 'Thailand', '66'], ['TL', 'Timor-Leste', '670'], ['TG', 'Togo', '228'],
  ['TO', 'Tonga', '676'], ['TT', 'Trinidad and Tobago', '1868'], ['TN', 'Tunisia', '216'], ['TR', 'Türkiye', '90'],
  ['TM', 'Turkmenistan', '993'], ['TC', 'Turks and Caicos Islands', '1649'], ['TV', 'Tuvalu', '688'],
  ['VI', 'U.S. Virgin Islands', '1340'], ['UG', 'Uganda', '256'], ['UA', 'Ukraine', '380'], ['UY', 'Uruguay', '598'],
  ['UZ', 'Uzbekistan', '998'], ['VU', 'Vanuatu', '678'], ['VE', 'Venezuela', '58'], ['VN', 'Vietnam', '84'],
  ['WF', 'Wallis and Futuna', '681'], ['YE', 'Yemen', '967'], ['ZM', 'Zambia', '260'], ['ZW', 'Zimbabwe', '263'],
];

/** "IN" → 🇮🇳 (regional indicator letters). */
const flagOf = (iso: string) => String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));

/** Every country: the detailed ones first, then the rest of the world A–Z. */
export const DIAL_COUNTRIES: DialCountry[] = [
  ...DETAILED_COUNTRIES.map(c => ({ ...c, aliases: ALIASES[c.iso] })),
  ...OTHER_COUNTRIES
    .filter(([iso]) => !DETAILED_COUNTRIES.some(c => c.iso === iso))
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([iso, name, dial]): DialCountry => ({
      iso, name, dial, flag: flagOf(iso), aliases: ALIASES[iso],
      maxDigits: 15 - dial.length, groups: [3, 3, 4], placeholder: 'Phone number',
    })),
];

export const DEFAULT_DIAL_COUNTRY = DIAL_COUNTRIES[0];

export const findDialCountry = (iso: string) => DIAL_COUNTRIES.find(c => c.iso === iso) ?? DEFAULT_DIAL_COUNTRY;

// Longest dial code first so "+971…" never matches a shorter code by accident.
// Where two countries share a code (+1 US/Canada, +7 Russia/Kazakhstan, +262 Réunion/Mayotte)
// a pasted number goes to the first listed here; the user can still pick the other one.
const PRIMARY_FOR_SHARED_CODE = new Set(['US', 'RU', 'RE']);
const BY_DIAL_LENGTH = [...DIAL_COUNTRIES].sort((a, b) =>
  b.dial.length - a.dial.length
  || Number(PRIMARY_FOR_SHARED_CODE.has(b.iso)) - Number(PRIMARY_FOR_SHARED_CODE.has(a.iso)));

/**
 * A stored phone value split into its country and national digits. "+91 98765 43210" →
 * India + "9876543210"; a number saved without a code ("050 123 4567") is read as
 * `fallback`'s, dropping the trunk 0.
 */
export function splitStoredPhone(value: string | null | undefined, fallback: DialCountry): { country: DialCountry; digits: string } {
  const raw = (value ?? '').trim();
  if (!raw) return { country: fallback, digits: '' };
  // Like parsePhoneInput, but never trims digits: a saved number is shown whole, even one
  // longer than the country's usual length (e.g. an old "05294333346").
  let country = fallback;
  let digits = nationalDigits(raw);
  if (raw.startsWith('+') || raw.startsWith('00')) {
    if (raw.startsWith('00')) digits = digits.slice(2);
    const match = BY_DIAL_LENGTH.find(c => digits.startsWith(c.dial) && digits.length > c.dial.length);
    if (match) { country = match; digits = digits.slice(match.dial.length); }
  } else if (digits.length > fallback.maxDigits && digits.startsWith(fallback.dial)) {
    digits = digits.slice(fallback.dial.length);
  }
  return { country, digits: digits.replace(/^0+/, '') };
}

/** The value the staff forms store: "+{dial} {digits}", or "" without a number. */
export function joinPhone(country: DialCountry, digits: string): string {
  const d = nationalDigits(digits);
  return d ? `+${country.dial} ${d}` : '';
}

/** "501234567" → "50 123 4567"; digits past the last group stay on the end. */
export function formatNational(digits: string, groups: number[]): string {
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  if (i < digits.length) parts[parts.length - 1] += digits.slice(i);
  return parts.join(' ');
}

export function nationalDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Normalises whatever was typed, pasted or autofilled into the national-number
 * box. A full international number ("+971 50…", "00971…") switches the country;
 * a trunk 0 ("050…") or a repeated dial code ("97150…") is dropped.
 * Returns the country to use and the display value.
 */
export function parsePhoneInput(raw: string, current: DialCountry, format = true): { country: DialCountry; value: string } {
  const trimmed = raw.trim();
  let country = current;
  let digits = nationalDigits(trimmed);

  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    if (trimmed.startsWith('00')) digits = digits.slice(2);
    const match = BY_DIAL_LENGTH.find(c => digits.startsWith(c.dial) && digits.length > c.dial.length);
    // Still typing the code ("+97") — leave it alone until it resolves.
    if (!match) return { country, value: trimmed.replace(/[^\d+ ]/g, '') };
    country = match;
    digits = digits.slice(match.dial.length);
  } else if (digits.length > current.maxDigits && digits.startsWith(current.dial)) {
    digits = digits.slice(current.dial.length);
  }

  // Known mobile formats are capped at their exact length; others at the E.164 limit.
  const cap = country.mobilePattern ? country.maxDigits : 15 - country.dial.length;
  digits = digits.replace(/^0+/, '').slice(0, cap);
  return { country, value: format ? formatNational(digits, country.groups) : digits };
}

/** Value sent to the API, e.g. "+971501234567". */
export function toInternational(country: DialCountry, value: string): string {
  const digits = nationalDigits(value);
  return digits ? `+${country.dial}${digits}` : '';
}

/** Returns an error message, or null when the number is acceptable. */
export function validatePhone(country: DialCountry, value: string): string | null {
  const digits = nationalDigits(value);
  if (!digits) return 'Please enter your phone number';
  if (country.mobilePattern) {
    return country.mobilePattern.test(digits) ? null : (country.mobileHint ?? 'Please enter a valid mobile number');
  }
  // Same bounds the backend enforces (7–15 digits overall).
  const total = country.dial.length + digits.length;
  return digits.length >= 7 && total <= 15 ? null : 'Please enter a valid phone number';
}
