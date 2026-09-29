import { Link } from 'react-router-dom';

export function Home() {
	return (
		<article className="fm-issue fm-home">
			<section className="fm-lede">
				<h1>Community rules, argued in public, decided by independent reasoning.</h1>
				<p className="fm-lede__dek">
					FairMod is a multi-community moderation protocol built as a GenLayer Intelligent Contract. Communities
					write their own natural-language constitutions; cases are decided by validators independently
					reasoning over evidence and rules — not a centralized API call, and not simple keyword filtering.
				</p>
				<div className="fm-lede__actions">
					<Link to="/communities" className="fm-button fm-button--primary">
						Browse communities
					</Link>
					<Link to="/how-it-works" className="fm-button">
						How FairMod works
					</Link>
				</div>
			</section>

			<section className="fm-explainer">
				<div>
					<h2>What</h2>
					<p>Community moderation decided through GenLayer Intelligent Contracts, with a public, auditable record of every case.</p>
				</div>
				<div>
					<h2>Why</h2>
					<p>Natural-language community rules require contextual interpretation, not a keyword blocklist. A GenLayer validator set reasons over each case the way a human moderator would — independently, and reproducibly.</p>
				</div>
				<div>
					<h2>How</h2>
					<p>Community constitution → case + evidence → independent validator reasoning → moderation verdict → challenge / finality → public receipt and history.</p>
				</div>
			</section>
		</article>
	);
}
