import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWalletContext } from '../adapter/WalletProvider';
import { canWrite } from '../adapter/useWallet';
import { getConfiguredContractAddress } from '../config/network';
import { useAsync } from '../hooks/useAsync';
import {
	getCommunity,
	getConstitution,
	getActiveConstitutionVersion,
	getCommunityCases,
	getCommunityStats,
	getRole,
	createCase,
} from '../adapter/fairmodAdapter';
import { BOUNDS } from '../domain/constraints';
import { VerdictBadge } from '../components/VerdictBadge';
import { AdministrationTab } from './community/AdministrationTab';
import { ConstitutionAuthoringTab } from './community/ConstitutionAuthoringTab';
import type { Community, Constitution, CommunityStats, Case } from '../domain/types';

type Tab = 'overview' | 'constitution' | 'cases' | 'transparency' | 'administration';

export function CommunityDetail() {
	const { communityId = '' } = useParams();
	const wallet = useWalletContext();
	const address = getConfiguredContractAddress();
	const [tab, setTab] = useState<Tab>('overview');
	const [page, setPage] = useState(0);
	const pageSize = 20;

	const community = useAsync<Community>(() => getCommunity(wallet.client, address, communityId), [address, communityId, wallet.client]);
	const activeVersion = useAsync<number>(() => getActiveConstitutionVersion(wallet.client, address, communityId), [address, communityId, wallet.client]);
	// No point issuing a doomed read (and no need to) when no wallet is
	// connected — get_role would be called with an invalid empty-string
	// address. Skip the RPC call entirely rather than let it fail.
	const role = useAsync(
		() => (wallet.address ? getRole(wallet.client, address, communityId, wallet.address) : Promise.resolve('NONE')),
		[address, communityId, wallet.address, wallet.client],
	);

	if (!address) return <p role="status">Contract not configured.</p>;
	if (community.status === 'loading') return <p role="status">Loading community…</p>;
	if (community.status === 'error') return <p role="alert">{community.error.message}</p>;

	return (
		<article className="fm-community">
			<header className="fm-community__header">
				<h1>{community.data.name}</h1>
				{community.data.metadata && <p className="fm-community__dek">{community.data.metadata}</p>}
				<p className="fm-community__meta">
					Owner {community.data.owner.slice(0, 8)}… · {community.data.case_counter} cases
					{wallet.status === 'connected' && role.status === 'success' && role.data !== 'NONE' && (
						<> · your role: <strong>{role.data}</strong></>
					)}
				</p>
			</header>

			<nav className="fm-tabs" aria-label="Community sections">
				{(['overview', 'constitution', 'cases', 'transparency', 'administration'] as Tab[]).map((t) => (
					<button key={t} type="button" aria-current={tab === t} onClick={() => setTab(t)}>
						{t[0].toUpperCase() + t.slice(1)}
					</button>
				))}
			</nav>

			{tab === 'overview' && (
				<OverviewTab communityId={communityId} address={address} client={wallet.client} canSubmit={canWrite(wallet)} />
			)}
			{tab === 'constitution' && (
				<>
					<ConstitutionTab
						communityId={communityId}
						address={address}
						client={wallet.client}
						activeVersion={activeVersion.status === 'success' ? activeVersion.data : undefined}
					/>
					{canWrite(wallet) && (
						<details className="fm-authoring-disclosure">
							<summary>Draft a new constitution version</summary>
							<ConstitutionAuthoringTab
								communityId={communityId}
								address={address}
								isAuthorized={role.status === 'success' && (role.data === 'OWNER' || role.data === 'ADMIN')}
								activeVersion={activeVersion.status === 'success' ? activeVersion.data : undefined}
							/>
						</details>
					)}
				</>
			)}
			{tab === 'cases' && (
				<CasesTab communityId={communityId} address={address} client={wallet.client} page={page} setPage={setPage} pageSize={pageSize} />
			)}
			{tab === 'transparency' && <TransparencyTab communityId={communityId} address={address} client={wallet.client} />}
			{tab === 'administration' && (
				<AdministrationTab
					communityId={communityId}
					address={address}
					community={community.data}
					isOwner={canWrite(wallet) && wallet.address?.toLowerCase() === community.data.owner.toLowerCase()}
				/>
			)}
		</article>
	);
}

function OverviewTab({ communityId, address, client, canSubmit }: { communityId: string; address: string; client: Parameters<typeof getCommunity>[0]; canSubmit: boolean }) {
	const [content, setContent] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [createdId, setCreatedId] = useState<string | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit || content.length === 0 || submitting) return;
		setSubmitting(true);
		setError(undefined);
		try {
			const hash = await createCase(client, address, communityId, content);
			// create_case returns the new case_id as its structured return
			// value once mined; for the immediate UX we surface the tx hash
			// and let the user follow through to the case page once ready.
			setCreatedId(hash);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<section>
			<h2>Submit a case</h2>
			{canSubmit ? (
				<form onSubmit={(e) => void onSubmit(e)}>
					<label>
						Reported content
						<textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={BOUNDS.MAX_CASE_CONTENT_LEN} required />
					</label>
					<p className="fm-field-help">{content.length}/{BOUNDS.MAX_CASE_CONTENT_LEN}</p>
					<button type="submit" className="fm-button fm-button--primary" disabled={submitting || content.length === 0}>
						{submitting ? 'Submitting…' : 'Submit case'}
					</button>
					{error && <p role="alert">{error}</p>}
					{createdId && <p role="status">Submitted (transaction {createdId}). Open the Cases tab once it settles to add evidence and freeze it.</p>}
				</form>
			) : (
				<p>Connect a wallet to submit a case to this community.</p>
			)}
		</section>
	);
}

function ConstitutionTab({ communityId, address, client, activeVersion }: { communityId: string; address: string; client: Parameters<typeof getConstitution>[0]; activeVersion: number | undefined }) {
	const constitution = useAsync<Constitution>(
		() => (activeVersion ? getConstitution(client, address, communityId, activeVersion) : Promise.reject(new Error('no active constitution'))),
		[address, communityId, activeVersion, client],
	);

	if (activeVersion === 0 || activeVersion === undefined) {
		return <p className="fm-empty">This community has no active constitution yet.</p>;
	}
	if (constitution.status === 'loading') return <p role="status">Loading constitution…</p>;
	if (constitution.status === 'error') return <p role="alert">{constitution.error.message}</p>;

	const ruleIds = Object.keys(constitution.data.rules);
	return (
		<section className="fm-rulebook">
			<h2>Constitution v{constitution.data.version}</h2>
			<p className="fm-community__meta">Active since {constitution.data.activated_at}</p>
			{ruleIds.length === 0 ? (
				<p className="fm-empty">No rules recorded.</p>
			) : (
				<dl>
					{ruleIds.map((id) => {
						const r = constitution.data.rules[id];
						return (
							<div key={id} className="fm-rule">
								<dt>
									<code>{id}</code> — {r.title}
								</dt>
								<dd>{r.definition}</dd>
								{r.exceptions.length > 0 && (
									<dd className="fm-rule__exceptions">
										Exceptions: {r.exceptions.join('; ')}
									</dd>
								)}
							</div>
						);
					})}
				</dl>
			)}
		</section>
	);
}

function CasesTab({ communityId, address, client, page, setPage, pageSize }: { communityId: string; address: string; client: Parameters<typeof getCommunityCases>[0]; page: number; setPage: (p: number) => void; pageSize: number }) {
	const cases = useAsync<Case[]>(() => getCommunityCases(client, address, communityId, page * pageSize, pageSize), [address, communityId, page, pageSize, client]);

	if (cases.status === 'loading') return <p role="status">Loading cases…</p>;
	if (cases.status === 'error') return <p role="alert">{cases.error.message}</p>;
	if (cases.data.length === 0 && page === 0) return <p className="fm-empty">No cases yet.</p>;

	return (
		<section>
			<ul className="fm-case-list">
				{cases.data.map((c) => (
					<li key={c.case_id}>
						{/* Case IDs contain "#" (e.g. "c1#0"), which is the URL fragment
						delimiter — an unencoded link would have the browser/router
						treat everything after "#" as a hash, not part of the path,
						truncating the actual case id that reaches CaseDetail. */}
						<Link to={`/cases/${encodeURIComponent(c.case_id)}`}>
							<span className="fm-case-list__id">{c.case_id}</span>
							<VerdictBadge value={c.final_verdict || c.verdict} />
							<span className="fm-case-list__state">{c.state}</span>
						</Link>
					</li>
				))}
			</ul>
			<div className="fm-pagination">
				<button type="button" disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>
					Previous
				</button>
				<span>Page {page + 1}</span>
				<button type="button" disabled={cases.data.length < pageSize} onClick={() => setPage(page + 1)}>
					Next
				</button>
			</div>
		</section>
	);
}

function TransparencyTab({ communityId, address, client }: { communityId: string; address: string; client: Parameters<typeof getCommunityStats>[0] }) {
	const stats = useAsync<CommunityStats>(() => getCommunityStats(client, address, communityId), [address, communityId, client]);
	if (stats.status === 'loading') return <p role="status">Loading transparency counters…</p>;
	if (stats.status === 'error') return <p role="alert">{stats.error.message}</p>;
	const s = stats.data;
	return (
		<section className="fm-counters">
			<h2>Transparency</h2>
			<dl>
				<div><dt>Total cases</dt><dd>{s.total_cases}</dd></div>
				<div><dt>Initial allowed</dt><dd>{s.total_initial_allowed}</dd></div>
				<div><dt>Initial flagged</dt><dd>{s.total_initial_flagged}</dd></div>
				<div><dt>Sent to review</dt><dd>{s.total_initial_needs_review}</dd></div>
				<div><dt>Challenged</dt><dd>{s.total_challenged}</dd></div>
				<div><dt>Overturned on challenge</dt><dd>{s.total_overturned}</dd></div>
				<div><dt>Finalized</dt><dd>{s.total_finalized}</dd></div>
				<div><dt>Final: allowed</dt><dd>{s.total_final_allowed}</dd></div>
				<div><dt>Final: flagged</dt><dd>{s.total_final_flagged}</dd></div>
				<div><dt>Final: undetermined</dt><dd>{s.total_final_undetermined}</dd></div>
			</dl>
		</section>
	);
}
