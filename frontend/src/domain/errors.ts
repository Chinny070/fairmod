/**
 * Typed FairMod frontend error taxonomy (Stage 7 §15). Every adapter/UI
 * failure normalizes into exactly one of these codes, carrying both a
 * human-readable message and the raw underlying error for an expandable
 * "technical details" affordance — never destroyed, never the primary
 * message shown to the user.
 */
export type FairModErrorCode =
	| 'WALLET_NOT_FOUND'
	| 'WALLET_REJECTED'
	| 'WALLET_DISCONNECTED'
	| 'WRONG_NETWORK'
	| 'INVALID_INPUT'
	| 'ROLE_NOT_AUTHORIZED'
	| 'PRECONDITION_FAILED'
	| 'CONTRACT_NOT_CONFIGURED'
	| 'CONTRACT_NOT_FOUND'
	| 'RPC_FAILURE'
	| 'READ_FAILURE'
	| 'WRITE_SUBMISSION_FAILURE'
	| 'TRANSACTION_EXECUTION_FAILURE'
	| 'CONSENSUS_UNDETERMINED'
	| 'STATE_NOT_CONFIRMED'
	| 'EVIDENCE_UNAVAILABLE'
	| 'CHALLENGE_WINDOW_CLOSED'
	| 'FINALIZATION_NOT_READY'
	| 'UNKNOWN_PROTOCOL_ERROR';

export class FairModError extends Error {
	readonly code: FairModErrorCode;
	readonly cause?: unknown;

	constructor(code: FairModErrorCode, message: string, cause?: unknown) {
		super(message);
		this.name = 'FairModError';
		this.code = code;
		this.cause = cause;
	}
}

const CONTRACT_MESSAGE_PATTERNS: Array<[RegExp, FairModErrorCode, string]> = [
	[/not authorized/i, 'ROLE_NOT_AUTHORIZED', 'You do not hold the role required for this action in this community.'],
	[/only the community owner/i, 'ROLE_NOT_AUTHORIZED', 'Only the community owner can perform this action.'],
	[/challenge window has closed/i, 'CHALLENGE_WINDOW_CLOSED', 'The challenge window for this case has already closed.'],
	[/challenge window has not yet closed/i, 'FINALIZATION_NOT_READY', 'This case cannot be finalized yet — its challenge window is still open.'],
	[/review deadline has not yet passed/i, 'FINALIZATION_NOT_READY', 'This case cannot be finalized yet — its review deadline has not passed.'],
	[/must be EVIDENCE_FROZEN/i, 'PRECONDITION_FAILED', 'This case must be frozen before it can be adjudicated.'],
	[/all evidence must leave PENDING/i, 'EVIDENCE_UNAVAILABLE', 'Some evidence on this case is still pending acquisition — trigger acquisition first.'],
	[/does not exist/i, 'PRECONDITION_FAILED', 'The requested community, case, or evidence item does not exist.'],
	[/exceeds max length|must not be empty|must be one of|must match the canonical format/i, 'INVALID_INPUT', 'One of the submitted values did not meet the contract’s requirements.'],
];

/** Normalizes a raw error (from the adapter/SDK boundary) into the typed taxonomy, never discarding the original. */
export function normalizeError(err: unknown): FairModError {
	if (err instanceof FairModError) return err;

	const message = err instanceof Error ? err.message : String(err);

	for (const [pattern, code, friendly] of CONTRACT_MESSAGE_PATTERNS) {
		if (pattern.test(message)) {
			return new FairModError(code, friendly, err);
		}
	}

	if (/not found/i.test(message) && /contract/i.test(message)) {
		return new FairModError('CONTRACT_NOT_FOUND', 'The FairMod contract was not found at the configured address.', err);
	}
	if (/user rejected|denied transaction/i.test(message)) {
		return new FairModError('WALLET_REJECTED', 'The wallet request was rejected.', err);
	}
	if (/network|fetch failed|ECONNREFUSED|timeout/i.test(message)) {
		return new FairModError('RPC_FAILURE', 'Could not reach the StudioNet RPC endpoint.', err);
	}

	// Falling through every known pattern is itself diagnostically useful —
	// log the raw error so it's visible in the browser console instead of
	// only the generic message reaching the UI.
	console.error('FairMod: unrecognized error', err);
	return new FairModError('UNKNOWN_PROTOCOL_ERROR', 'An unexpected error occurred.', err);
}
