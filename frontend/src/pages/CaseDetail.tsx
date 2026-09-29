import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWalletContext } from '../adapter/WalletProvider';
import { getConfiguredContractAddress } from '../config/network';
import { useAsync } from '../hooks/useAsync';
import {
	getCase,
	getContext,
	listEvidence,
	getEvidence,
	freezeCase,
	adjudicateCase,
	acquireEvidence,
	submitEvidence,
	fileChallenge,
	resolveChallenge,
	finalizeCase,
	getModerationReceipt,
	getCasePrecedents,
	runFairnessMirror,
} from '../adapter/fairmodAdapter';
import { writeAndConfirm } from '../adapter/writeAndConfirm';
import { VerdictBadge } from '../components/VerdictBadge';
import { TxStatus } from '../components/TxStatus';
import { previewEvidenceUrl, BOUNDS } from '../domain/constraints';
import type { Case, Evidence, ContextItem, ModerationReceipt as ModerationReceiptT, CasePrecedent } from '../domain/types';
import type { TxObservation } from '../adapter/txLifecycle';

export function CaseDetail() {
	const { caseId = '' } = useParams();
	const wallet = useWalletContext();
	const address = getConfiguredContractAddress();

	const caseState = useAsync<Case>(() => getCase(wallet.client, address, caseId), [address, caseId, wallet.client]);
	const context = useAsync<ContextItem[]>(() => getContext(wallet.client, address, caseId), [address, caseId, wallet.client]);
	const evidenceIds = useAsync<string[]>(() => listEvidence(wallet.client, address, caseId), [address, caseId, wallet.client]);

	if (!address) return <p role="status">Contract not configured.</p>;
	if (caseState.status === 'loading') return <p role="status">Loading case…</p>;
	if (caseState.status === 'error') return <p role="alert">{caseState.error.message}</p>;

	const c = caseState.data;

	return (
		<article className="fm-case-file">
			<header>
				<h1>Case {c.case_id}</h1>
				<p className="fm-case-file__state">
					State: <strong>{c.state}</strong> · constitution v{c.constitution_version}
				</p>
			</header>

			<section className="fm-case-file__content">
				<h2>Reported content</h2>
				<p>{c.content}</p>
			</section>

			{context.status === 'success' && context.data.length > 0 && (
				<section>
					<h2>Context</h2>
					<ul>
						{context.data.map((item, i) => (
							<li key={i}><em>{item.kind}</em>: {item.content}</li>
						))}
					</ul>
				</section>
			)}

			<EvidenceSection caseId={caseId} address={address} caseState={c} evidenceIds={evidenceIds.status === 'success' ? evidenceIds.data : []} reload={evidenceIds.reload} />

			<LifecycleActions caseId={caseId} address={address} caseState={c} reload={caseState.reload} />

			{(c.verdict || c.final_verdict) && (
				<section className="fm-case-file__verdict">
					<h2>Decision</h2>
					<p>
						Initial verdict: <VerdictBadge value={c.verdict} />
						{c.violated_rule_ids.length > 0 && <> — rules: {c.violated_rule_ids.map((r) => <code key={r}>{r}</code>)}</>}
					</p>
					{c.explanation && <p>{c.explanation}</p>}
					{c.final_verdict && (
						<p>
							Application-final verdict: <VerdictBadge value={c.final_verdict} />
							{c.final_rule_ids.length > 0 && <> — rules: {c.final_rule_ids.map((r) => <code key={r}>{r}</code>)}</>}
						</p>
					)}
				</section>
			)}

			{c.state === 'FINAL' && (
				<>
					<ReceiptSection caseId={caseId} address={address} client={wallet.client} />
					<PrecedentSection communityId={c.community_id} address={address} client={wallet.client} ruleIds={c.final_rule_ids} />
					<FairnessMirrorSection caseId={caseId} address={address} client={wallet.client} status={c.fairness_mirror_status} canRun={wallet.status === 'connected'} />
				</>
			)}
		</article>
	);
}

function EvidenceSection({ caseId, address, caseState, evidenceIds, reload }: { caseId: string; address: string; caseState: Case; evidenceIds: string[]; reload: () => void }) {
	const wallet = useWalletContext();
	const [ref, setRef] = useState('');
	const [type, setType] = useState<'TEXT' | 'WEB_LINK' | 'IMAGE'>('TEXT');
	const [error, setError] = useState<string | undefined>(undefined);
	const preview = type === 'TEXT' ? { ok: true } : previewEvidenceUrl(ref);

	async function onSubmitEvidence(e: React.FormEvent) {
		e.preventDefault();
		try {
			await submitEvidence(wallet.client, address, caseId, { evidenceType: type, reference: ref, sourceCategory: '' });
			setRef('');
			reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	async function onAcquire(evidenceId: string) {
		await acquireEvidence(wallet.client, address, caseId, evidenceId);
		reload();
	}

	return (
		<section className="fm-evidence">
			<h2>Evidence ({evidenceIds.length}/{BOUNDS.MAX_EVIDENCE_PER_CASE})</h2>
			<ul>
				{evidenceIds.map((id) => (
					<EvidenceRow key={id} caseId={caseId} address={address} evidenceId={id} onAcquire={() => void onAcquire(id)} />
				))}
			</ul>
			{caseState.state === 'OPEN' && (
				<form onSubmit={(e) => void onSubmitEvidence(e)} className="fm-evidence__form">
					<label>
						Type
						<select value={type} onChange={(e) => setType(e.target.value as 'TEXT' | 'WEB_LINK' | 'IMAGE')}>
							<option value="TEXT">Text</option>
							<option value="WEB_LINK">Web link (validator-fetched)</option>
							<option value="IMAGE">Image (validator-interpreted screenshot)</option>
						</select>
					</label>
					<label>
						{type === 'TEXT' ? 'Text content' : 'Reference URL (https://)'}
						<input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={BOUNDS.MAX_EVIDENCE_REFERENCE_LEN} required />
					</label>
					{type !== 'TEXT' && !preview.ok && 'reason' in preview && <p role="alert">{preview.reason}</p>}
					{type !== 'TEXT' && (
						<p className="fm-field-help">
							This URL will be fetched/rendered independently by each validator — your browser never fetches it on the contract’s behalf.
						</p>
					)}
					<button type="submit" className="fm-button">Submit evidence</button>
					{error && <p role="alert">{error}</p>}
				</form>
			)}
		</section>
	);
}

function EvidenceRow({ caseId, address, evidenceId, onAcquire }: { caseId: string; address: string; evidenceId: string; onAcquire: () => void }) {
	const wallet = useWalletContext();
	const ev = useAsync<Evidence>(() => getEvidence(wallet.client, address, caseId, evidenceId), [address, caseId, evidenceId, wallet.client]);
	if (ev.status === 'loading') return <li>Loading…</li>;
	if (ev.status === 'error') return <li role="alert">{ev.error.message}</li>;
	const e = ev.data;
	return (
		<li className="fm-evidence__row">
			<strong>{e.evidence_type}</strong>{' '}
			{e.evidence_type === 'TEXT' ? e.reference : <span title={e.reference}>{e.source_host || e.reference}</span>}
			{' — '}
			<span className={`fm-retrieval fm-retrieval--${e.retrieval_status.toLowerCase()}`}>{e.retrieval_status}</span>
			{e.retrieval_status === 'ACQUIRED' && e.content_excerpt && <p className="fm-evidence__excerpt">“{e.content_excerpt}”</p>}
			{e.retrieval_status !== 'ACQUIRED' && e.retrieval_status !== 'NOT_APPLICABLE' && e.retrieval_status !== 'UNSUPPORTED' && (
				<p className="fm-evidence__note">
					{e.retrieval_status === 'PENDING'
						? 'Not yet acquired by validators.'
						: 'This item could not be verified — it is not treated as established fact and does not by itself prove or disprove the case.'}
				</p>
			)}
			{e.retrieval_status === 'PENDING' && (
				<button type="button" onClick={onAcquire}>Trigger acquisition</button>
			)}
		</li>
	);
}

function LifecycleActions({ caseId, address, caseState, reload }: { caseId: string; address: string; caseState: Case; reload: () => void }) {
	const wallet = useWalletContext();
	const [observation, setObservation] = useState<TxObservation | undefined>(undefined);
	const [confirmed, setConfirmed] = useState<boolean | undefined>(undefined);
	const [reason, setReason] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);

	async function run(action: () => Promise<`0x${string}`>, expect: (c: Case) => boolean) {
		setBusy(true);
		setError(undefined);
		try {
			const result = await writeAndConfirm(wallet.client, action, () => getCase(wallet.client, address, caseId), expect);
			setObservation(result.observation);
			setConfirmed(result.applicationConfirmed);
			reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	}

	return (
		<section className="fm-actions">
			{caseState.state === 'OPEN' && (
				<button type="button" disabled={busy} onClick={() => void run(() => freezeCase(wallet.client, address, caseId), (c) => c.state !== 'OPEN')}>
					Freeze case
				</button>
			)}
			{caseState.state === 'EVIDENCE_FROZEN' && (
				<button type="button" disabled={busy} onClick={() => void run(() => adjudicateCase(wallet.client, address, caseId), (c) => c.state === 'DECIDED' || c.state === 'NEEDS_REVIEW')}>
					Request adjudication
				</button>
			)}
			{caseState.state === 'DECIDED' && (
				<form onSubmit={(e) => { e.preventDefault(); void run(() => fileChallenge(wallet.client, address, caseId, reason), (c) => c.state === 'CHALLENGED'); }}>
					<label>
						Challenge reason
						<textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={BOUNDS.MAX_CHALLENGE_REASON_LEN} required />
					</label>
					<button type="submit" disabled={busy}>File challenge</button>
					<button type="button" disabled={busy} onClick={() => void run(() => finalizeCase(wallet.client, address, caseId), (c) => c.state === 'FINAL')}>
						Finalize (after challenge window closes)
					</button>
				</form>
			)}
			{caseState.state === 'CHALLENGED' && (
				<button type="button" disabled={busy} onClick={() => void run(() => resolveChallenge(wallet.client, address, caseId), (c) => c.state === 'FINAL')}>
					Resolve challenge
				</button>
			)}
			{caseState.state === 'NEEDS_REVIEW' && (
				<button type="button" disabled={busy} onClick={() => void run(() => finalizeCase(wallet.client, address, caseId), (c) => c.state === 'FINAL')}>
					Finalize (after review deadline)
				</button>
			)}
			{error && <p role="alert">{error}</p>}
			<TxStatus observation={observation} applicationConfirmed={confirmed} />
		</section>
	);
}

function ReceiptSection({ caseId, address, client }: { caseId: string; address: string; client: Parameters<typeof getModerationReceipt>[0] }) {
	const receipt = useAsync<ModerationReceiptT>(() => getModerationReceipt(client, address, caseId), [address, caseId, client]);
	if (receipt.status !== 'success') return null;
	return (
		<section className="fm-receipt">
			<h2>Moderation receipt</h2>
			<dl>
				<div><dt>Content fingerprint</dt><dd><code>{receipt.data.content_fingerprint}</code></dd></div>
				<div><dt>Decided</dt><dd>{receipt.data.decided_at}</dd></div>
				<div><dt>Finalized</dt><dd>{receipt.data.finalized_at}</dd></div>
			</dl>
		</section>
	);
}

function PrecedentSection({ communityId, address, client, ruleIds }: { communityId: string; address: string; client: Parameters<typeof getCasePrecedents>[0]; ruleIds: string[] }) {
	const ruleId = ruleIds[0];
	const precedents = useAsync<CasePrecedent[]>(
		() => (ruleId ? getCasePrecedents(client, address, communityId, ruleId, BOUNDS.MAX_PRECEDENT_RESULTS) : Promise.resolve([])),
		[address, communityId, ruleId, client],
	);
	if (!ruleId || precedents.status !== 'success' || precedents.data.length === 0) return null;
	return (
		<section className="fm-precedent fm-nonauthoritative">
			<h2>Precedent for {ruleId} <span className="fm-nonauthoritative__tag">informational — not binding</span></h2>
			<ul>
				{precedents.data.map((p) => (
					<li key={p.case_id}>{p.case_id} — <VerdictBadge value={p.final_verdict} /> (constitution v{p.constitution_version})</li>
				))}
			</ul>
		</section>
	);
}

function FairnessMirrorSection({ caseId, address, client, status, canRun }: { caseId: string; address: string; client: Parameters<typeof runFairnessMirror>[0]; status: Case['fairness_mirror_status']; canRun: boolean }) {
	const [running, setRunning] = useState(false);
	const [result, setResult] = useState<string>(status);
	const [error, setError] = useState<string | undefined>(undefined);

	async function onRun() {
		setRunning(true);
		setError(undefined);
		try {
			// writeContract resolves with a transaction hash, not the decoded
			// on-chain return value — the authoritative fairness_mirror_status
			// is only known once the case is re-read (see CaseDetail's reload of
			// getCase after any write). We optimistically mark it "submitted"
			// here rather than fabricating a result string.
			await runFairnessMirror(client, address, caseId);
			setResult('Submitted — reload the case to see the settled result.');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setRunning(false);
		}
	}

	return (
		<section className="fm-fairness-mirror fm-nonauthoritative">
			<h2>Fairness Mirror <span className="fm-nonauthoritative__tag">non-authoritative — never changes the verdict</span></h2>
			{result ? (
				<p>Result: {result}</p>
			) : canRun ? (
				<button type="button" disabled={running} onClick={() => void onRun()}>
					{running ? 'Running…' : 'Run Fairness Mirror check'}
				</button>
			) : (
				<p className="fm-empty">No Fairness Mirror result yet.</p>
			)}
			{error && <p role="alert">{error}</p>}
		</section>
	);
}
