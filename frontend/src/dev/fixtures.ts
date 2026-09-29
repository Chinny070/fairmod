/**
 * Deterministic development/visual fixtures (Stage 7 §33). ISOLATED from any
 * production data path — nothing in src/adapter or src/pages imports this
 * file. It exists only for component-level manual/visual development and is
 * exercised by tests that need representative shapes without a live chain.
 */
import type { Case, Community, Evidence } from '../domain/types';

export const FIXTURE_COMMUNITY: Community = {
	community_id: 'c0',
	owner: '0x1111111111111111111111111111111111111111',
	created_at: '2026-01-01T00:00:00+00:00',
	name: 'Riverside Forum',
	metadata: 'A community discussion board for the Riverside neighborhood association.',
	status: 'ACTIVE',
	active_constitution_version: 2,
	case_counter: 6,
};

const BASE_CASE: Omit<Case, 'case_id' | 'state' | 'verdict' | 'violated_rule_ids' | 'final_verdict' | 'final_rule_ids' | 'challenge_outcome' | 'fairness_mirror_status'> = {
	community_id: 'c0',
	reporter: '0x2222222222222222222222222222222222222222',
	created_at: '2026-02-01T00:00:00+00:00',
	constitution_version: 2,
	content: 'You are a worthless idiot, everyone should pile on your account.',
	frozen_at: '2026-02-01T00:05:00+00:00',
	evidence_count: 1,
	context_count: 0,
	explanation: '',
	material_facts: '',
	evidence_used: [],
	needs_review_reason: '',
	decided_at: '',
	challenge_deadline: '',
	review_deadline: '',
	challenger: '',
	challenge_reason: '',
	challenged_at: '',
	challenge_explanation: '',
	challenge_decided_at: '',
	finalized_at: '',
	fairness_mirror_explanation: '',
	fairness_mirror_material_basis: '',
	fairness_mirror_at: '',
};

export const FIXTURE_CASE_FLAGGED: Case = {
	...BASE_CASE,
	case_id: 'c0#0',
	state: 'DECIDED',
	verdict: 'FLAGGED',
	violated_rule_ids: ['HARASSMENT'],
	explanation: 'The message directly targets another user with an insult and calls for others to pile on.',
	decided_at: '2026-02-01T00:10:00+00:00',
	challenge_deadline: '2026-02-02T00:10:00+00:00',
	final_verdict: '',
	final_rule_ids: [],
	challenge_outcome: '',
	fairness_mirror_status: '',
};

export const FIXTURE_CASE_ALLOWED: Case = {
	...BASE_CASE,
	case_id: 'c0#1',
	content: 'I strongly disagree with the moderator’s ruling, I think it was handled poorly.',
	state: 'FINAL',
	verdict: 'ALLOWED',
	violated_rule_ids: [],
	explanation: 'Criticism of a decision is not targeted harassment of a person.',
	decided_at: '2026-02-02T00:00:00+00:00',
	challenge_deadline: '2026-02-03T00:00:00+00:00',
	final_verdict: 'ALLOWED',
	final_rule_ids: [],
	finalized_at: '2026-02-03T00:00:00+00:00',
	challenge_outcome: '',
	fairness_mirror_status: 'CONSISTENT',
	fairness_mirror_explanation: 'No constitutionally-irrelevant cue was present in the material facts considered.',
};

export const FIXTURE_CASE_CHALLENGED: Case = {
	...BASE_CASE,
	case_id: 'c0#2',
	state: 'CHALLENGED',
	verdict: 'FLAGGED',
	violated_rule_ids: ['SPAM'],
	explanation: 'Repeated unsolicited promotional links.',
	decided_at: '2026-02-03T00:00:00+00:00',
	challenge_deadline: '2026-02-04T00:00:00+00:00',
	challenger: '0x2222222222222222222222222222222222222222',
	challenge_reason: 'This was a single legitimate recommendation, not spam.',
	challenged_at: '2026-02-03T12:00:00+00:00',
	final_verdict: '',
	final_rule_ids: [],
	challenge_outcome: '',
	fairness_mirror_status: '',
};

export const FIXTURE_CASE_UNDETERMINED: Case = {
	...BASE_CASE,
	case_id: 'c0#3',
	state: 'FINAL',
	verdict: 'NEEDS_REVIEW',
	violated_rule_ids: [],
	needs_review_reason: 'EVIDENCE_UNAVAILABLE',
	decided_at: '2026-02-04T00:00:00+00:00',
	review_deadline: '2026-02-05T00:00:00+00:00',
	final_verdict: 'UNDETERMINED',
	final_rule_ids: [],
	finalized_at: '2026-02-05T00:00:01+00:00',
	challenge_outcome: '',
	fairness_mirror_status: '',
};

export const FIXTURE_EVIDENCE_WEB_UNAVAILABLE: Evidence = {
	evidence_id: 'c0#0:e0',
	case_id: 'c0#0',
	community_id: 'c0',
	submitter: '0x2222222222222222222222222222222222222222',
	evidence_type: 'WEB_LINK',
	reference: 'https://example.com/deleted-post',
	source_category: 'screenshot-of-post',
	submitted_at: '2026-02-01T00:01:00+00:00',
	frozen: true,
	retrieval_status: 'UNAVAILABLE',
	representation: '',
	source_host: 'example.com',
	reference_fingerprint: 'a1b2c3',
	observation_fingerprint: '',
	content_excerpt: '',
	acquired_at: '2026-02-01T00:06:00+00:00',
	error_class: 'EXTERNAL:HTTP_ERROR',
	attempts: 3,
};
