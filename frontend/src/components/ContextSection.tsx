import { useState } from 'react';
import { useWalletContext } from '../adapter/WalletProvider';
import { canWrite } from '../adapter/useWallet';
import { addContext } from '../adapter/fairmodAdapter';
import { BOUNDS } from '../domain/constraints';
import type { ContextItem, Case } from '../domain/types';

/**
 * Case context — add_context (Stage 7.1 Gap 1). Deliberately visually and
 * semantically distinct from Evidence and from the Verdict: context is
 * background the reporter/community supplies about the situation, not an
 * evidentiary artifact with its own acquisition/retrieval status, and it is
 * never itself an independently-authoritative fact the way a verdict is
 * (contracts/fairmod.py: `_frozen_context_text` feeds it into the
 * adjudication prompt as context, exactly like evidence text — it is
 * weighed by the model, not treated as pre-established fact by the
 * contract itself).
 */
export function ContextSection({ caseId, address, contextItems, caseState, reload }: { caseId: string; address: string; contextItems: ContextItem[]; caseState: Case['state']; reload: () => void }) {
	const wallet = useWalletContext();
	const [kind, setKind] = useState('');
	const [content, setContent] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (busy || kind.length === 0 || content.length === 0 || !canWrite(wallet)) return;
		setBusy(true);
		setError(undefined);
		try {
			await addContext(wallet.client, address, caseId, kind, content);
			setKind('');
			setContent('');
			reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	}

	return (
		<section className="fm-context">
			<h2>Context</h2>
			<p className="fm-context-note">
				Background the reporter or a moderator has added about the situation — not evidence with its own
				acquisition status, and not itself an authoritative fact. The adjudicator weighs it alongside the
				reported content and evidence; it does not by itself establish anything.
			</p>
			{contextItems.length === 0 ? (
				<p className="fm-empty">No context added.</p>
			) : (
				<ul className="fm-context-list">
					{contextItems.map((item, i) => (
						<li key={i}>
							<strong>{item.kind}</strong>: {item.content}
						</li>
					))}
				</ul>
			)}
			{caseState === 'OPEN' && (
				<form onSubmit={(e) => void onSubmit(e)}>
					<label>
						Kind
						<input value={kind} onChange={(e) => setKind(e.target.value)} maxLength={BOUNDS.MAX_NAME_LEN} placeholder="e.g. prior warning, related thread" required />
					</label>
					<label>
						Content
						<textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={BOUNDS.MAX_CONTEXT_ITEM_LEN} required />
					</label>
					<button type="submit" disabled={busy || !canWrite(wallet)}>
						{busy ? 'Adding…' : 'Add context'}
					</button>
					{!canWrite(wallet) && <p className="fm-field-help">Connect a wallet on StudioNet to add context.</p>}
					{error && <p role="alert">{error}</p>}
				</form>
			)}
		</section>
	);
}
