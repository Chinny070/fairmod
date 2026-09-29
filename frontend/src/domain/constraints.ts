/**
 * Client-side mirrors of contracts/fairmod.py's deterministic bounds
 * (Stage 6 hash 417cf3de...). These exist ONLY to give the user early,
 * friendly feedback before submitting a transaction — the contract remains
 * the sole authority and re-validates everything itself. Centralized here
 * so no component hardcodes a magic number that could drift from the
 * contract's own constants (see contracts/fairmod.py lines ~40-230).
 */
export const BOUNDS = {
	MAX_NAME_LEN: 80,
	MAX_METADATA_LEN: 500,
	MAX_RULE_ID_LEN: 40,
	MAX_RULE_DEFINITION_LEN: 2000,
	MAX_RULE_EXCEPTION_LEN: 300,
	MAX_RULE_EXCEPTIONS: 10,
	MAX_EVIDENCE_POLICY_LEN: 200,
	MAX_RULES_PER_CONSTITUTION: 50,
	MAX_MODERATORS_PER_COMMUNITY: 50,
	MAX_CASE_CONTENT_LEN: 4000,
	MAX_CONTEXT_ITEMS: 10,
	MAX_CONTEXT_ITEM_LEN: 2000,
	MAX_EVIDENCE_PER_CASE: 20,
	MAX_EVIDENCE_REFERENCE_LEN: 2000,
	MAX_EVIDENCE_SOURCE_CATEGORY_LEN: 60,
	MAX_CHALLENGE_REASON_LEN: 1000,
	MAX_PAGE_SIZE: 50,
	MAX_PRECEDENT_RESULTS: 20,
} as const;

/** Canonical logical Rule ID format (contracts/fairmod.py: _canonical_rule_id). */
export const RULE_ID_PATTERN = /^[A-Z0-9_]+$/;

export function isValidRuleId(value: string): boolean {
	return value.length > 0 && value.length <= BOUNDS.MAX_RULE_ID_LEN && RULE_ID_PATTERN.test(value);
}

/** Mirrors contracts/fairmod.py: _validate_https_url's deterministic checks (client-side preview only). */
const BLOCKED_HOSTS = new Set(['localhost', '0.0.0.0', '::1']);
const BLOCKED_PREFIXES = ['127.', '10.', '192.168.', '169.254.'];

export function looksLikeBlockedHost(host: string): boolean {
	const h = host.toLowerCase();
	if (BLOCKED_HOSTS.has(h)) return true;
	if (BLOCKED_PREFIXES.some((p) => h.startsWith(p))) return true;
	if (h.startsWith('172.')) {
		const octet = Number(h.slice(4).split('.')[0]);
		if (Number.isFinite(octet) && octet >= 16 && octet <= 31) return true;
	}
	return false;
}

export interface UrlPreviewResult {
	ok: boolean;
	reason?: string;
	host?: string;
}

/** Client-side preview only — never authoritative. The contract re-validates independently. */
export function previewEvidenceUrl(url: string): UrlPreviewResult {
	if (typeof url !== 'string' || url.length === 0) {
		return { ok: false, reason: 'A reference URL is required.' };
	}
	if (url.length > BOUNDS.MAX_EVIDENCE_REFERENCE_LEN) {
		return { ok: false, reason: `Reference exceeds ${BOUNDS.MAX_EVIDENCE_REFERENCE_LEN} characters.` };
	}
	if (!url.startsWith('https://')) {
		return { ok: false, reason: 'Only https:// references are supported.' };
	}
	const rest = url.slice('https://'.length);
	const authority = rest.split('/')[0]?.split('?')[0]?.split('#')[0] ?? '';
	if (authority.length === 0) {
		return { ok: false, reason: 'The URL is missing a host.' };
	}
	if (authority.includes('@')) {
		return { ok: false, reason: 'The URL must not embed credentials.' };
	}
	const host = authority.split(':')[0].toLowerCase();
	if (looksLikeBlockedHost(host)) {
		return { ok: false, reason: 'This host looks like a private/loopback address and will likely be rejected by the contract.' };
	}
	return { ok: true, host };
}
