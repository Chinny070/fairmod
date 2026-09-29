import type { TxObservation } from '../adapter/txLifecycle';
import { explorerTxUrl } from '../config/network';

const PHASE_COPY: Record<TxObservation['phase'], string> = {
	submitted: 'Submitted — awaiting validator consensus…',
	pending_consensus: 'Consensus/round activity in progress…',
	execution_success: 'Execution succeeded — awaiting protocol finality…',
	execution_error: 'Execution failed at the GenVM layer.',
	protocol_finalized: 'Protocol-finalized.',
	undetermined: 'Consensus could not reach a determined result.',
	canceled: 'Transaction was canceled.',
	timeout: 'Validators/leader timed out.',
};

/**
 * Reusable transaction status display (Stage 7 §14). Renders ONLY what the
 * SDK's own observation actually reports — never fabricates validator
 * detail. `applicationConfirmed` (from writeAndConfirm) is a SEPARATE,
 * later state this component does not itself claim — callers show their
 * own "application success" copy only once that field is true.
 */
export function TxStatus({ observation, applicationConfirmed }: { observation: TxObservation | undefined; applicationConfirmed?: boolean }) {
	if (!observation) {
		return <p className="fm-tx-status fm-tx-status--awaiting">Awaiting wallet signature…</p>;
	}
	return (
		<div className="fm-tx-status" data-phase={observation.phase}>
			<p>{PHASE_COPY[observation.phase]}</p>
			<p className="fm-tx-status__hash">
				Transaction:{' '}
				<a href={explorerTxUrl(observation.hash)} target="_blank" rel="noopener noreferrer nofollow">
					{observation.hash}
				</a>
			</p>
			{observation.executionSucceeded === false && (
				<p className="fm-tx-status__warning" role="alert">
					GenVM execution reported an error for this transaction. Application state was almost certainly NOT changed as expected — see re-read state below rather than trusting this transaction alone.
				</p>
			)}
			{observation.phase === 'protocol_finalized' && applicationConfirmed === false && (
				<p className="fm-tx-status__warning" role="alert">
					This transaction reached protocol finality, but the expected FairMod application state change was NOT confirmed on re-read. Do not treat this as a successful action.
				</p>
			)}
			{applicationConfirmed === true && (
				<p className="fm-tx-status__success" role="status">
					Confirmed by re-reading authoritative contract state.
				</p>
			)}
		</div>
	);
}
