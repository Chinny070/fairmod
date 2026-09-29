import { Link } from 'react-router-dom';
import { useWalletContext } from '../adapter/WalletProvider';
import { useAsync } from '../hooks/useAsync';
import { getConfiguredContractAddress } from '../config/network';
import { listCommunities, getCommunity } from '../adapter/fairmodAdapter';
import type { Community } from '../domain/types';

export function Communities() {
	const wallet = useWalletContext();
	const address = getConfiguredContractAddress();

	const state = useAsync<Community[]>(async () => {
		const ids = await listCommunities(wallet.client, address);
		return Promise.all(ids.map((id) => getCommunity(wallet.client, address, id)));
	}, [address, wallet.client]);

	if (!address) {
		return <p role="status">Contract not configured — the community directory cannot load.</p>;
	}
	if (state.status === 'loading') return <p role="status">Loading communities…</p>;
	if (state.status === 'error') return <p role="alert">Could not load communities: {state.error.message}</p>;
	if (state.data.length === 0) {
		return (
			<div className="fm-empty">
				<p>No communities yet.</p>
				<Link to="/communities/new" className="fm-button fm-button--primary">
					Create the first community
				</Link>
			</div>
		);
	}

	return (
		<section className="fm-directory" aria-label="Community directory">
			<h1>Community directory</h1>
			<Link to="/communities/new" className="fm-button">
				Create a community
			</Link>
			<ul className="fm-directory__list">
				{state.data.map((c) => (
					<li key={c.community_id}>
						<Link to={`/communities/${c.community_id}`}>
							<strong>{c.name}</strong>
							<span className="fm-directory__meta">
								{c.case_counter} case{c.case_counter === 1 ? '' : 's'} · constitution v{c.active_constitution_version || '—'}
							</span>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
