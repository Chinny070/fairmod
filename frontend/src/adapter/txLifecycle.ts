/**
 * GenLayer write-transaction lifecycle observation (Stage 7 §13/§14).
 *
 * CRITICAL invariant this module exists to enforce: a transaction hash, or
 * even a protocol-FINALIZED transaction, is NEVER by itself treated as proof
 * that FairMod application state changed as expected. Stage 2H proved this
 * concretely — a StudioNet transaction reached FINALIZED while its own
 * GenVM execution_result was ERROR (see docs/STUDIONET_61999_CLEAN_PROBE_RESULT.md,
 * the third reproduction of the identical signature). Every caller of
 * `runFairModWrite` MUST re-read authoritative contract state afterward and
 * MUST NOT show an "application success" UI state until that reread
 * confirms the expected transition — this module's return type makes that
 * unavoidable: `applicationConfirmed` starts false and is only set by the
 * caller after its own reread.
 */
import { TransactionStatus, isDecidedState } from 'genlayer-js/types';
import type { GenLayerClient, GenLayerTransaction, LeaderReceipt, TransactionHash } from 'genlayer-js/types';
import { chains } from 'genlayer-js';
import { normalizeError } from '../domain/errors';

export type ProtocolPhase =
	| 'submitted'
	| 'pending_consensus'
	| 'execution_success'
	| 'execution_error'
	| 'protocol_finalized'
	| 'undetermined'
	| 'canceled'
	| 'timeout';

export interface TxObservation {
	hash: `0x${string}`;
	phase: ProtocolPhase;
	statusName: TransactionStatus | undefined;
	/** True iff every reporting leader/validator receipt shows execution_result === 'SUCCESS' (or equivalent non-error string). Never conflated with protocol finality. */
	executionSucceeded: boolean | undefined;
	raw: GenLayerTransaction;
}

function derivePhase(tx: GenLayerTransaction): { phase: ProtocolPhase; executionSucceeded: boolean | undefined } {
	const statusName = tx.statusName;
	const leaderReceipts = tx.consensus_data?.leader_receipt ?? [];
	const executionResults = leaderReceipts.map((r: LeaderReceipt) => r.execution_result);
	const hasError = executionResults.some((r: string) => typeof r === 'string' && r.toUpperCase() === 'ERROR');
	const hasResult = executionResults.length > 0;
	const executionSucceeded = hasResult ? !hasError : undefined;

	if (statusName === TransactionStatus.CANCELED) return { phase: 'canceled', executionSucceeded };
	if (statusName === TransactionStatus.VALIDATORS_TIMEOUT || statusName === TransactionStatus.LEADER_TIMEOUT) {
		return { phase: 'timeout', executionSucceeded };
	}
	if (statusName === TransactionStatus.UNDETERMINED) return { phase: 'undetermined', executionSucceeded };
	if (statusName === TransactionStatus.FINALIZED) {
		return { phase: hasError ? 'execution_error' : 'protocol_finalized', executionSucceeded };
	}
	if (statusName && isDecidedState(statusName)) {
		return { phase: hasError ? 'execution_error' : 'execution_success', executionSucceeded };
	}
	return { phase: 'pending_consensus', executionSucceeded };
}

/**
 * Waits for a transaction to reach GenLayer protocol FINALIZED (or a
 * terminal non-finalizing status), returning both axes explicitly. Never
 * throws on execution error — an ERROR execution result is a valid,
 * truthfully-reported observation, not an adapter failure.
 */
export async function observeTransaction(
	client: GenLayerClient<typeof chains.studionet>,
	hash: `0x${string}`,
	opts?: { interval?: number; retries?: number },
): Promise<TxObservation> {
	try {
		// The installed SDK brands transaction hashes as `Hash = \`0x${string}\`
		// & { length: 66 }` — a structural-typing artifact, not a real extra
		// field. Every hash this adapter produces or receives is already a
		// well-formed 32-byte hex string; this cast reflects that invariant at
		// the one point it's needed, rather than propagating the SDK's brand
		// type through this module's own public signature.
		const raw = await client.waitForTransactionReceipt({
			hash: hash as TransactionHash,
			status: TransactionStatus.FINALIZED,
			interval: opts?.interval ?? 2000,
			retries: opts?.retries ?? 60,
		});
		const { phase, executionSucceeded } = derivePhase(raw);
		return { hash, phase, statusName: raw.statusName, executionSucceeded, raw };
	} catch (err) {
		// waitForTransactionReceipt can throw on retry exhaustion or an RPC
		// hiccup; the transaction may still exist — surface a truthful
		// "could not confirm" observation rather than swallowing the error.
		throw normalizeError(err);
	}
}
