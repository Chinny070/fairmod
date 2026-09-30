import { Link, Outlet } from 'react-router-dom';
import { useWalletContext } from '../adapter/WalletProvider';
import { describeNetworkMismatch } from '../adapter/useWallet';
import { getConfiguredContractAddress } from '../config/network';

export function Layout() {
	const wallet = useWalletContext();
	const configuredAddress = getConfiguredContractAddress();
	const mismatch = describeNetworkMismatch(wallet.chainId);

	return (
		<div className="fm-shell">
			<header className="fm-masthead">
				<Link to="/" className="fm-masthead__title">
					FairMod <span className="fm-masthead__sub">— a public moderation record</span>
				</Link>
				<nav className="fm-masthead__nav" aria-label="Primary">
					<Link to="/communities">Communities</Link>
					<Link to="/how-it-works">How it works</Link>
				</nav>
				<div className="fm-masthead__wallet">
					{wallet.status === 'connected' && wallet.address ? (
						<span className="fm-address" title={wallet.address}>
							{wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
						</span>
					) : (
						<button type="button" onClick={() => void wallet.connect()}>
							Connect wallet
						</button>
					)}
				</div>
			</header>
			{!configuredAddress && (
				<div className="fm-banner fm-banner--warn" role="status">
					No FairMod contract address is configured for this environment (VITE_FAIRMOD_CONTRACT_ADDRESS). Read-only browsing of a live contract and all write actions are unavailable until one is set.
				</div>
			)}
			{mismatch && (
				<div className="fm-banner fm-banner--warn" role="alert">
					{mismatch}
				</div>
			)}
			<main className="fm-main">
				<Outlet />
			</main>
			<footer className="fm-footer">
				<p>
					FairMod is a GenLayer Intelligent Contract, deployed and verified live on StudioNet. See the{' '}
					<a href="https://github.com/genlayerlabs/genvm-manager/issues/50" target="_blank" rel="noopener noreferrer nofollow">
						genlayerlabs/genvm-manager#50
					</a>{' '}
					deployment-tooling history for how an earlier source-layout issue was diagnosed and resolved.
				</p>
			</footer>
		</div>
	);
}
