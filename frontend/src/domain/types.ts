/**
 * FairMod domain types — derived directly from contracts/fairmod.py and
 * docs/fairmod_schema.json (the authoritative Stage 6 release-candidate
 * schema, hash 417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36).
 * No field here is invented; every field name/shape matches what the
 * contract's own get_* view methods actually return (see docs/STAGE_*_VERIFICATION.md
 * for the field-by-field provenance of each dict).
 */

export type Hex = `0x${string}`;

// --- Roles (contracts/fairmod.py: ROLE_OWNER/ROLE_ADMIN/ROLE_MODERATOR) ---
export type Role = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'NONE';

// --- Community (get_community) ---
export interface Community {
	community_id: string;
	owner: Hex;
	created_at: string;
	name: string;
	metadata: string;
	status: string;
	active_constitution_version: number;
	case_counter: number;
}

// --- Constitution (get_constitution) ---
export interface RuleView {
	title: string;
	definition: string;
	category: string;
	exceptions: string[];
	context_required: boolean;
	evidence_policy: string;
}

export type ConstitutionStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface Constitution {
	community_id: string;
	version: number;
	status: ConstitutionStatus;
	created_at: string;
	activated_at: string;
	retired_at: string;
	rules: Record<string, RuleView>;
}

// --- Evidence (get_evidence / list_evidence) ---
export type EvidenceType = 'TEXT' | 'WEB_LINK' | 'DOCUMENT' | 'IMAGE';

export type RetrievalStatus =
	| 'NOT_APPLICABLE'
	| 'PENDING'
	| 'ACQUIRED'
	| 'UNAVAILABLE'
	| 'UNSUPPORTED'
	| 'DIVERGENT'
	| 'AMBIGUOUS'
	| 'ERROR';

export type DocRepresentation = 'HTML_TEXT' | 'IMAGE' | 'UNSUPPORTED_FORMAT' | '';

export interface Evidence {
	evidence_id: string;
	case_id: string;
	community_id: string;
	submitter: Hex;
	evidence_type: EvidenceType;
	reference: string;
	source_category: string;
	submitted_at: string;
	frozen: boolean;
	retrieval_status: RetrievalStatus;
	representation: DocRepresentation;
	source_host: string;
	reference_fingerprint: string;
	observation_fingerprint: string;
	content_excerpt: string;
	acquired_at: string;
	error_class: string;
	attempts: number;
}

// --- Case state machine (contracts/fairmod.py CASE_* constants) ---
export type CaseState =
	| 'OPEN'
	| 'EVIDENCE_FROZEN'
	| 'DECIDED'
	| 'NEEDS_REVIEW'
	| 'CHALLENGED'
	| 'FINAL';

export type Verdict = '' | 'ALLOWED' | 'FLAGGED' | 'NEEDS_REVIEW';

export type ChallengeOutcome = '' | 'UPHOLD' | 'OVERTURN' | 'NEEDS_REVIEW';

export type FinalVerdict = '' | 'ALLOWED' | 'FLAGGED' | 'UNDETERMINED';

export type FairnessMirrorStatus = '' | 'CONSISTENT' | 'POTENTIAL_INCONSISTENCY' | 'INCONCLUSIVE';

// --- Case (get_case / get_moderation_receipt) ---
export interface Case {
	case_id: string;
	community_id: string;
	reporter: Hex;
	created_at: string;
	constitution_version: number;
	content: string;
	state: CaseState;
	frozen_at: string;
	evidence_count: number;
	context_count: number;

	verdict: Verdict;
	violated_rule_ids: string[];
	explanation: string;
	material_facts: string;
	evidence_used: string[];
	needs_review_reason: string;
	decided_at: string;

	challenge_deadline: string;
	review_deadline: string;
	challenger: string;
	challenge_reason: string;
	challenged_at: string;
	challenge_outcome: ChallengeOutcome;
	challenge_explanation: string;
	challenge_decided_at: string;
	final_verdict: FinalVerdict;
	final_rule_ids: string[];
	finalized_at: string;

	fairness_mirror_status: FairnessMirrorStatus;
	fairness_mirror_explanation: string;
	fairness_mirror_material_basis: string;
	fairness_mirror_at: string;
}

/** get_moderation_receipt adds exactly one field beyond get_case. */
export interface ModerationReceipt extends Case {
	content_fingerprint: string;
}

export interface ContextItem {
	kind: string;
	content: string;
	added_at: string;
}

export interface CasePrecedent {
	case_id: string;
	constitution_version: number;
	final_verdict: 'ALLOWED' | 'FLAGGED';
	final_rule_ids: string[];
	finalized_at: string;
}

export interface CommunityStats {
	community_id: string;
	total_cases: number;
	total_initial_allowed: number;
	total_initial_flagged: number;
	total_initial_needs_review: number;
	total_challenged: number;
	total_overturned: number;
	total_finalized: number;
	total_final_allowed: number;
	total_final_flagged: number;
	total_final_undetermined: number;
}
