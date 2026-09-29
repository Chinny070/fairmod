import { describe, it, expect } from 'vitest';
import { isValidRuleId, looksLikeBlockedHost, previewEvidenceUrl } from './constraints';

describe('isValidRuleId', () => {
	it('accepts canonical rule ids', () => {
		expect(isValidRuleId('HARASSMENT')).toBe(true);
		expect(isValidRuleId('RULE_2')).toBe(true);
	});
	it('rejects lowercase, spaces, and empty', () => {
		expect(isValidRuleId('harassment')).toBe(false);
		expect(isValidRuleId('HARASSMENT!')).toBe(false);
		expect(isValidRuleId(' HARASSMENT ')).toBe(false);
		expect(isValidRuleId('')).toBe(false);
	});
	it('rejects ids exceeding the max length', () => {
		expect(isValidRuleId('A'.repeat(41))).toBe(false);
		expect(isValidRuleId('A'.repeat(40))).toBe(true);
	});
});

describe('looksLikeBlockedHost', () => {
	it('blocks loopback and private ranges', () => {
		expect(looksLikeBlockedHost('localhost')).toBe(true);
		expect(looksLikeBlockedHost('127.0.0.1')).toBe(true);
		expect(looksLikeBlockedHost('10.0.0.5')).toBe(true);
		expect(looksLikeBlockedHost('192.168.1.1')).toBe(true);
		expect(looksLikeBlockedHost('172.16.0.1')).toBe(true);
		expect(looksLikeBlockedHost('172.31.255.255')).toBe(true);
		expect(looksLikeBlockedHost('169.254.0.1')).toBe(true);
	});
	it('does not block public hosts or adjacent 172.x ranges', () => {
		expect(looksLikeBlockedHost('example.com')).toBe(false);
		expect(looksLikeBlockedHost('172.15.0.1')).toBe(false);
		expect(looksLikeBlockedHost('172.32.0.1')).toBe(false);
	});
});

describe('previewEvidenceUrl', () => {
	it('accepts a well-formed https url', () => {
		const result = previewEvidenceUrl('https://example.com/page');
		expect(result.ok).toBe(true);
		expect(result.host).toBe('example.com');
	});
	it('rejects non-https schemes', () => {
		expect(previewEvidenceUrl('http://example.com').ok).toBe(false);
		expect(previewEvidenceUrl('ftp://example.com').ok).toBe(false);
		expect(previewEvidenceUrl('javascript:alert(1)').ok).toBe(false);
	});
	it('rejects credentials embedded in the url', () => {
		expect(previewEvidenceUrl('https://user:pass@example.com').ok).toBe(false);
	});
	it('rejects an empty url', () => {
		expect(previewEvidenceUrl('').ok).toBe(false);
	});
	it('flags a private host even though it is syntactically valid https', () => {
		const result = previewEvidenceUrl('https://127.0.0.1/x');
		expect(result.ok).toBe(false);
	});
});
