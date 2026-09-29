import { VerdictBadge } from '../components/VerdictBadge';
import { DEV_MODE } from '../config/network';

/**
 * DEV-ONLY responsive/overflow stress-test surface (Stage 7.1 Gap 2).
 * Renders representative long-content shapes (long addresses, long URLs,
 * long rule definitions, long explanations) so overflow can be checked at
 * real viewport widths without a live contract. Gated by VITE_FAIRMOD_DEV_MODE
 * — returns null in any build where that isn't explicitly set, so it can
 * never appear in production regardless of routing.
 */
const LONG_ADDRESS = '0xaffE15eEc45b68835cc9E5B4Ab85dD5deaE8e70bLONGSUFFIXFORSTRESSTEST';
const LONG_URL = 'https://example.com/a/very/long/path/segment/that/keeps/going/and/going/to/see/if/it/overflows/the/container/width/on/a/narrow/mobile/viewport/1234567890';
const LONG_RULE_DEFINITION =
	'No content that targets another identifiable member of this community with repeated, escalating, or coordinated abusive conduct including but not limited to insults, threats, dogpiling, or organized harassment campaigns across multiple posts or threads, whether the targeting is explicit or conducted through insinuation, dog-whistles, or serialized indirect references that a reasonable reader would recognize as being directed at a specific person.';
const LONG_EXPLANATION =
	'The reported content directly names another user and calls for coordinated pile-on behavior against their account, which the frozen evidence corroborates via an archived screenshot showing the original message alongside three follow-up replies escalating the same target, satisfying the HARASSMENT rule’s definition of repeated or coordinated abusive conduct against an identifiable member of this community.';

export function DevPreview() {
	if (!DEV_MODE) return null;
	return (
		<article className="fm-issue">
			<h1>Dev preview — long-content stress test</h1>
			<section>
				<h2>Verdict badges</h2>
				<VerdictBadge value="ALLOWED" /> <VerdictBadge value="FLAGGED" /> <VerdictBadge value="NEEDS_REVIEW" /> <VerdictBadge value="UNDETERMINED" />
			</section>
			<section className="fm-case-file__content">
				<h2>Long address</h2>
				<p><code>{LONG_ADDRESS}</code></p>
				<h2>Long evidence URL</h2>
				<p><span title={LONG_URL}>{LONG_URL}</span></p>
				<h2>Long rule definition</h2>
				<dl>
					<div className="fm-rule">
						<dt><code>HARASSMENT_ESCALATED_COORDINATED_CAMPAIGN</code> — Escalated coordinated harassment</dt>
						<dd>{LONG_RULE_DEFINITION}</dd>
					</div>
				</dl>
				<h2>Long moderation explanation</h2>
				<p>{LONG_EXPLANATION}</p>
			</section>
		</article>
	);
}
