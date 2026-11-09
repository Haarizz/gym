import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIAL_COUNTRY, DIAL_COUNTRIES, findDialCountry, formatNational, joinPhone, parsePhoneInput, splitStoredPhone, toInternational, validatePhone,
} from '../phone-number';

const UAE = DEFAULT_DIAL_COUNTRY;
const IN = findDialCountry('IN');

describe('formatNational', () => {
  it('groups UAE mobiles as 50 123 4567', () => {
    expect(formatNational('501234567', UAE.groups)).toBe('50 123 4567');
    expect(formatNational('5012', UAE.groups)).toBe('50 12');
  });
});

describe('parsePhoneInput', () => {
  it('drops the trunk 0', () => {
    expect(parsePhoneInput('050 123 4567', UAE)).toEqual({ country: UAE, value: '50 123 4567' });
  });

  it('switches country for a pasted international number', () => {
    expect(parsePhoneInput('+91 98765 43210', UAE)).toEqual({ country: IN, value: '98765 43210' });
    expect(parsePhoneInput('00971501234567', IN)).toEqual({ country: UAE, value: '50 123 4567' });
  });

  it('waits while the dial code is still being typed', () => {
    expect(parsePhoneInput('+97', UAE)).toEqual({ country: UAE, value: '+97' });
  });

  it('strips a repeated dial code typed without +', () => {
    expect(parsePhoneInput('971501234567', UAE).value).toBe('50 123 4567');
  });

  it('caps UAE numbers at 9 digits', () => {
    expect(parsePhoneInput('5012345678', UAE).value).toBe('50 123 4567');
  });
});

describe('validatePhone', () => {
  it('requires a UAE mobile starting with 5', () => {
    expect(validatePhone(UAE, '50 123 4567')).toBeNull();
    expect(validatePhone(UAE, '40 123 4567')).toMatch(/UAE mobile/);
    expect(validatePhone(UAE, '50 123')).toMatch(/UAE mobile/);
    expect(validatePhone(UAE, '')).toBe('Please enter your phone number');
  });

  it('keeps the backend 7-digit minimum elsewhere', () => {
    expect(validatePhone(IN, '98765 43210')).toBeNull();
    expect(validatePhone(IN, '12345')).toBe('Please enter a valid phone number');
  });
});

describe('toInternational', () => {
  it('produces the +{dial}{digits} shape the backend stores', () => {
    expect(toInternational(UAE, '50 123 4567')).toBe('+971501234567');
  });
});

describe('country list', () => {

  it('covers the world with unique ISO codes, the detailed countries first', () => {
    expect(DIAL_COUNTRIES.length).toBeGreaterThan(200);
    expect(new Set(DIAL_COUNTRIES.map(c => c.iso)).size).toBe(DIAL_COUNTRIES.length);
    expect(DIAL_COUNTRIES[0].iso).toBe('AE');
    expect(DIAL_COUNTRIES.every(c => /^\d{1,4}$/.test(c.dial) && c.flag.length > 0)).toBe(true);
  });

  it('reads stored numbers with or without a code', () => {
    expect(splitStoredPhone('+91 9876543210', UAE)).toEqual({ country: IN, digits: '9876543210' });
    expect(splitStoredPhone('0501234567', UAE)).toEqual({ country: UAE, digits: '501234567' });
    expect(splitStoredPhone('', IN)).toEqual({ country: IN, digits: '' });
    expect(splitStoredPhone('+7 9161234567', UAE).country.iso).toBe('RU');
    expect(splitStoredPhone('+1 2015550123', UAE).country.iso).toBe('US');
    expect(splitStoredPhone('+1876 5551234', UAE).country.iso).toBe('JM');
    expect(splitStoredPhone('+44 7400123456', UAE).country.iso).toBe('GB');
    // A saved number is never cut down to the country's usual length.
    expect(splitStoredPhone('05294333346', UAE)).toEqual({ country: UAE, digits: '5294333346' });
  });

  it('stores "+{dial} {digits}"', () => {
    expect(joinPhone(IN, '98765 43210')).toBe('+91 9876543210');
    expect(joinPhone(UAE, '')).toBe('');
  });
});
