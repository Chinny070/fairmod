import { useState } from 'react';
import { useWalletContext } from '../../adapter/WalletProvider';
import { canWrite } from '../../adapter/useWallet';
import { createConstitutionDraft, addRule, activateConstitution, getConstitution } from '../../adapter/fairmodAdapter';
import { writeAndConfirm } from '../../adapter/writeAndConfirm';
import { useAsync } from '../../hooks/useAsync';
import { isValidRuleId, BOUNDS } from '../../domain/constraints';
import { TxStatus } from '../../components/TxStatus';
import type { TxObservation } from '../../adapter/txLifecycle';
import type { Constitution } from '../../domain/types';

/**
 * Constitution authoring — create_constitution_draft/add_rule/
 * activate_constitution (Stage 7.1 Gap 1). The contract is append/version
 * based (RuleRevision.docstring: rules are per-version, immutable once
 * status != DRAFT) — this UI never implies in-place editing of an
 * activated rule; a new draft version is the only way to change wording,
 * exactly matching contracts/fairmod.py's own model.
 */
export function ConstitutionAuthoringTab({ communityId, address, isAuthorized, activeVersion }: { communityId: string; address: string; isAuthorized: boolean; activeVersion: number | undefined }) {
	const wallet = useWalletContext();
	const [draftVersion, setDraftVersion] = useState<number | undefined>(undefined);
	const [observation, setObservation] = useState<TxObservation | undefined>(undefined);
	const [confirmed, setConfirmed] = useState<boolean | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);
	const [busy, setBusy] = useState(false);

	const draft = useAsync<Constitution | undefined>(
		() => (draftVersion ? getConstitution(wallet.client, address, communityId, draftVersion) : Promise.resolve(undefined)),
		[address, communityId, draftVersion, wallet.client],
	);

	if (!isAuthorized) {
		return <p className="fm-empty">Only this community&apos;s OWNER or ADMIN may draft or activate a constitution.</p>;
	}

	async function onCreateDraft() {
		setBusy(true);
		setError(undefined);
		try {
			const hash = await createConstitutionDraft(wallet.client, address, communityId);
			// create_constitution_draft's structured return (the new version
			// number) is not synchronously available from writeContract's own
			// promise (see the identical honest caveat on create_case) — the
			// author confirms the new draft version once the transaction
			// settles by entering it below, or we infer active+1 as a
			// best-effort guess pending reread.
			setObservation({ hash, phase: 'submitted', statusName: undefined, executionSucceeded: undefined, raw: {} as never });
			setDraftVersion((activeVersion ?? 0) + 1);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	}

	async function onActivate() {
		if (!draftVersion) return;
		setBusy(true);
		setError(undefined);
		try {
			const result = await writeAndConfirm(
				wallet.client,
				() => activateConstitution(wallet.client, address, communityId, draftVersion),
				() => getConstitution(wallet.client, address, communityId, draftVersion),
				(c) => c.status === 'ACTIVE',
			);
			setObservation(result.observation);
			setConfirmed(result.applicationConfirmed);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="fm-authoring">
			<p className="fm-field-help">
				Active constitution: {activeVersion ? <strong>v{activeVersion}</strong> : <em>none yet</em>}. A new draft is a
				separate, higher version number — activating it retires the current one but never rewrites what past
				cases were judged against.
			</p>

			{draftVersion === undefined ? (
				<button type="button" onClick={() => void onCreateDraft()} disabled={busy || !canWrite(wallet)}>
					{busy ? 'Creating draft…' : 'Start a new draft constitution'}
				</button>
			) : (
				<>
					<p>
						Draft version <strong>v{draftVersion}</strong>
						{' '}
						<label className="fm-field-help">
							(wrong version? <input aria-label="draft version override" type="number" min={1} value={draftVersion} onChange={(e) => setDraftVersion(Number(e.target.value))} style={{ width: '4em', display: 'inline-block' }} />)
						</label>
					</p>
					{draft.status === 'success' && draft.data && (
						<RuleList rules={draft.data.rules} status={draft.data.status} />
					)}
					<AddRuleForm communityId={communityId} address={address} version={draftVersion} onAdded={() => draft.reload()} />
					<ConfirmActivate onActivate={() => void onActivate()} disabled={busy || draft.status !== 'success' || Object.keys(draft.data?.rules ?? {}).length === 0} version={draftVersion} />
				</>
			)}

			{error && <p role="alert">{error}</p>}
			<TxStatus observation={observation} applicationConfirmed={confirmed} />
		</div>
	);
}

function RuleList({ rules, status }: { rules: Constitution['rules']; status: string }) {
	const ids = Object.keys(rules);
	return (
		<div className="fm-rulebook fm-rulebook--draft">
			<p className="fm-field-help">Status: <strong>{status}</strong> — {ids.length} rule{ids.length === 1 ? '' : 's'}</p>
			{ids.length > 0 && (
				<dl>
					{ids.map((id) => (
						<div key={id} className="fm-rule">
							<dt><code>{id}</code> — {rules[id].title}</dt>
							<dd>{rules[id].definition}</dd>
						</div>
					))}
				</dl>
			)}
		</div>
	);
}

function AddRuleForm({ communityId, address, version, onAdded }: { communityId: string; address: string; version: number; onAdded: () => void }) {
	const wallet = useWalletContext();
	const [ruleId, setRuleId] = useState('');
	const [title, setTitle] = useState('');
	const [definition, setDefinition] = useState('');
	const [error, setError] = useState<string | undefined>(undefined);
	const [busy, setBusy] = useState(false);

	const ruleIdInvalid = ruleId.length > 0 && !isValidRuleId(ruleId);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (ruleIdInvalid || busy) return;
		setBusy(true);
		setError(undefined);
		try {
			const pendingRuleId = ruleId;
			// Wait for the write to actually finalize before rereading the
			// draft — a submitted tx hash is not proof the rule is on-chain
			// yet, and rereading too early showed a stale "0 rules" draft
			// even after a successful add_rule (confirmed live on
			// StudioNet: reread raced ahead of finalization).
			await writeAndConfirm(
				wallet.client,
				() =>
					addRule(wallet.client, address, communityId, version, {
						ruleId,
						title,
						definition,
						category: '',
						exceptions: [],
						contextRequired: false,
						evidencePolicy: '',
					}),
				() => getConstitution(wallet.client, address, communityId, version),
				(c) => pendingRuleId in c.rules,
			);
			setRuleId('');
			setTitle('');
			setDefinition('');
			onAdded();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	}

	return (
		<form onSubmit={(e) => void onSubmit(e)} className="fm-add-rule">
			<h3>Add a rule</h3>
			<label>
				Rule ID (stable identifier, e.g. <code>HARASSMENT</code>)
				<input value={ruleId} onChange={(e) => setRuleId(e.target.value.toUpperCase())} maxLength={BOUNDS.MAX_RULE_ID_LEN} required aria-invalid={ruleIdInvalid} aria-describedby="rule-id-help" />
			</label>
			<p id="rule-id-help" className="fm-field-help">
				{ruleIdInvalid ? 'Only A–Z, 0–9, and _ are allowed — this ID is permanent once used and is never renamed.' : 'A–Z, 0–9, _ only.'}
			</p>
			<label>
				Title
				<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={BOUNDS.MAX_NAME_LEN} required />
			</label>
			<label>
				Definition (what the rule actually forbids — the validator reasons over this text directly)
				<textarea value={definition} onChange={(e) => setDefinition(e.target.value)} maxLength={BOUNDS.MAX_RULE_DEFINITION_LEN} required />
			</label>
			<button type="submit" disabled={busy || ruleIdInvalid || !canWrite(wallet)}>
				{busy ? 'Adding…' : 'Add rule to draft'}
			</button>
			{error && <p role="alert">{error}</p>}
		</form>
	);
}

function ConfirmActivate({ onActivate, disabled, version }: { onActivate: () => void; disabled: boolean; version: number }) {
	const [confirming, setConfirming] = useState(false);
	return (
		<div className="fm-activate">
			<button type="button" disabled={disabled} onClick={() => setConfirming(true)}>
				Activate v{version} as the governing constitution
			</button>
			{confirming && (
				<div role="dialog" aria-modal="true" aria-label="Confirm constitution activation" className="fm-confirm-dialog">
					<p>
						Activating v{version} retires the current active constitution and makes v{version} govern every case
						created from now on. This cannot be undone, and rules cannot be added to v{version} once activated.
						Past cases keep whichever version they were already bound to.
					</p>
					<button type="button" onClick={() => { onActivate(); setConfirming(false); }}>
						Confirm activation
					</button>
					<button type="button" onClick={() => setConfirming(false)}>
						Cancel
					</button>
				</div>
			)}
		</div>
	);
}
