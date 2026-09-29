/**
 * The mandatory write -> observe -> authoritative-reread pipeline (Stage 7
 * §13). No UI component may show "success" from a write call's return value
 * alone. This function is the single choke point that enforces that: it
 * always returns `applicationConfirmed` computed from a genuine reread, and
 * callers render their success state ONLY when that field is true.
 */
import type { GenLayerClient } from 'genlayer-js/types';
import { chains } from 'genlayer-js';
import { observeTransaction, type TxObservation } from './txLifecycle';
import { normalizeError, FairModError } from '../domain/errors';

type Client = GenLayerClient<typeof chains.studionet>;

export interface WriteAndConfirmResult<TState> {
	observation: TxObservation;
	/** The authoritative state read AFTER the transaction settled — always fetched, even on an execution error, so the UI can show what's actually true. */
	rereadState: TState | undefined;
	/** True only if `expectation(rereadState)` returned true. This is the ONLY field a "success" UI state may key off. */
	applicationConfirmed: boolean;
}

export async function writeAndConfirm<TState>(
	client: Client,
	submit: () => Promise<`0x${string}`>,
	reread: () => Promise<TState>,
	expectation: (state: TState) => boolean,
): Promise<WriteAndConfirmResult<TState>> {
	let hash: `0x${string}`;
	try {
		hash = await submit();
	} catch (err) {
		throw normalizeError(err);
	}

	const observation = await observeTransaction(client, hash);

	// We reread authoritative state regardless of the observed execution
	// result — a "successful" execution_result is still not proof of the
	// specific application-level transition we expect, and a reported
	// execution error does not preclude us from truthfully showing current
	// state (which may be unchanged, exactly as it should be).
	let rereadState: TState | undefined;
	try {
		rereadState = await reread();
	} catch (err) {
		// A reread failure after a write is itself informative (e.g. the
		// contract/case disappeared) — surface it as STATE_NOT_CONFIRMED
		// rather than silently reporting confirmed=false with no context.
		throw new FairModError('STATE_NOT_CONFIRMED', 'The transaction settled but authoritative state could not be re-read afterward.', err);
	}

	const applicationConfirmed = expectation(rereadState);
	return { observation, rereadState, applicationConfirmed };
}
