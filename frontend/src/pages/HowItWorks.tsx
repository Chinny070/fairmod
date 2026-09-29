export function HowItWorks() {
	return (
		<article className="fm-issue">
			<h1>How FairMod works</h1>
			<section>
				<h2>Why GenLayer is necessary</h2>
				<p>
					Community rules are natural language, not regexes. Deciding whether a message violates "no targeted
					harassment" requires contextual judgment. FairMod asks GenLayer's validator set to reason over the
					case directly against a community's own written rules — there is no centralized moderation API
					behind it.
				</p>
			</section>
			<section>
				<h2>What validators independently evaluate</h2>
				<p>
					Each validator independently re-executes the same evidence-acquisition and adjudication logic (a
					fetch, a screenshot interpretation, or a reasoning pass over the frozen case) rather than trusting a
					leader-supplied answer. Their results are compared under an "equivalence principle" — they must
					agree on the verdict and which rules were implicated, not on the exact wording of an explanation.
				</p>
			</section>
			<section>
				<h2>Web and visual evidence</h2>
				<p>
					A submitted web link is fetched independently by each validator, never by your browser. A submitted
					image reference is screenshotted and described by each validator independently. Unreachable or
					unclear evidence is marked as such and never silently treated as proof of anything.
				</p>
			</section>
			<section>
				<h2>Application finality vs. protocol finality</h2>
				<p>
					A FairMod case reaching its own <code>FINAL</code> state is a separate claim from the underlying
					GenLayer transaction reaching <code>FINALIZED</code> protocol status. This frontend always shows
					both, separately — a transaction can be protocol-finalized while its GenVM execution failed, and
					this app will tell you so rather than showing a false success.
				</p>
			</section>
			<section>
				<h2>Challenges</h2>
				<p>
					A decided case's reporter, or a community role-holder, may file one challenge within a fixed window.
					Resolving a challenge asks a structurally different question than the original decision — it is
					not a re-vote, and it can only cite rules from the same frozen constitution version the case was
					originally judged against.
				</p>
			</section>
			<section>
				<h2>Precedent and Fairness Mirror</h2>
				<p>
					Precedent is shown for context only — it never determines a new case's outcome, and no
					adjudication prompt ever reads it. Fairness Mirror is a non-authoritative consistency check run
					after a case is final; it can never change a verdict, and this app visually separates it from the
					binding decision at all times.
				</p>
			</section>
		</article>
	);
}
