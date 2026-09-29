import { describe, it, expect } from 'vitest';
import { normalizeError, FairModError } from './errors';

describe('normalizeError', () => {
	it('passes through an already-normalized FairModError unchanged', () => {
		const original = new FairModError('WALLET_REJECTED', 'nope');
		expect(normalizeError(original)).toBe(original);
	});

	it('maps a role-authorization contract revert to ROLE_NOT_AUTHORIZED', () => {
		const err = new Error('caller is not authorized for this action in this community');
		expect(normalizeError(err).code).toBe('ROLE_NOT_AUTHORIZED');
	});

	it('maps a closed challenge window revert to CHALLENGE_WINDOW_CLOSED', () => {
		const err = new Error('the challenge window has closed');
		expect(normalizeError(err).code).toBe('CHALLENGE_WINDOW_CLOSED');
	});

	it('maps a premature finalize revert to FINALIZATION_NOT_READY', () => {
		expect(normalizeError(new Error('the challenge window has not yet closed')).code).toBe('FINALIZATION_NOT_READY');
		expect(normalizeError(new Error('the review deadline has not yet passed')).code).toBe('FINALIZATION_NOT_READY');
	});

	it('maps a bounds violation to INVALID_INPUT', () => {
		expect(normalizeError(new Error('name exceeds max length 80')).code).toBe('INVALID_INPUT');
	});

	it('maps a missing-entity revert to PRECONDITION_FAILED', () => {
		expect(normalizeError(new Error('community does not exist')).code).toBe('PRECONDITION_FAILED');
	});

	it('maps wallet rejection phrasing to WALLET_REJECTED', () => {
		expect(normalizeError(new Error('User rejected the request.')).code).toBe('WALLET_REJECTED');
	});

	it('maps network-shaped errors to RPC_FAILURE', () => {
		expect(normalizeError(new Error('fetch failed')).code).toBe('RPC_FAILURE');
	});

	it('falls back to UNKNOWN_PROTOCOL_ERROR for an unrecognized message, preserving the cause', () => {
		const original = new Error('something totally unexpected');
		const normalized = normalizeError(original);
		expect(normalized.code).toBe('UNKNOWN_PROTOCOL_ERROR');
		expect(normalized.cause).toBe(original);
	});
});
