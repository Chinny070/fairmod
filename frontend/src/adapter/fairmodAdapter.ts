/**
 * FairMod protocol adapter — the ONLY place in this frontend that calls
 * genlayer-js's readContract/writeContract directly. Every method name,
 * argument order, and return shape below is taken verbatim from
 * docs/fairmod_schema.json (the Stage 6 release-candidate schema, hash
 * 417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36) and
 * cross-checked against contracts/fairmod.py's own public method bodies
 * (the "get_" view methods and their "write" counterparts) — nothing here
 * is invented from this stage's prompt text.
 *
 * All 30 public methods are represented (§29). None of FairMod's write
 * methods are payable (schema: every method's "payable" is false), so
 * every writeContract call below passes `value: 0n` — never a v2 `fees`
 * object, which does not exist in the installed 1.1.8 SDK.
 */
import type { GenLayerClient } from 'genlayer-js/types';
import { chains } from 'genlayer-js';
import { normalizeError, FairModError } from '../domain/errors';
import { requireContractAddress } from './client';
import type {
	Case,
	Community,
	CommunityStats,
	Constitution,
	ContextItem,
	Evidence,
	ModerationReceipt,
	CasePrecedent,
	Role,
} from '../domain/types';

type Client = GenLayerClient<typeof chains.studionet>;

async function view<T>(client: Client, address: string, functionName: string, args: unknown[] = []): Promise<T> {
	requireContractAddress(address);
	try {
		const result = await client.readContract({
			address,
			functionName,
			args: args as never,
		});
		return result as T;
	} catch (err) {
		throw normalizeError(err);
	}
}

async function write(client: Client, address: string, functionName: string, args: unknown[] = []): Promise<`0x${string}`> {
	requireContractAddress(address);
	try {
		const hash = await client.writeContract({
			address,
			functionName,
			args: args as never,
			value: 0n,
		});
		return hash as `0x${string}`;
	} catch (err) {
		throw normalizeError(err);
	}
}

// ---------------------------------------------------------------------------
// 2. Multi-community registry
// ---------------------------------------------------------------------------

export const createCommunity = (c: Client, addr: string, name: string, metadata: string) =>
	write(c, addr, 'create_community', [name, metadata]);

export const getCommunity = (c: Client, addr: string, communityId: string) =>
	view<Community>(c, addr, 'get_community', [communityId]);

export const listCommunities = (c: Client, addr: string) => view<string[]>(c, addr, 'list_communities', []);

// ---------------------------------------------------------------------------
// 3. Authority model
// ---------------------------------------------------------------------------

export const grantRole = (c: Client, addr: string, communityId: string, target: string, role: 'ADMIN' | 'MODERATOR') =>
	write(c, addr, 'grant_role', [communityId, target, role]);

export const revokeRole = (c: Client, addr: string, communityId: string, target: string) =>
	write(c, addr, 'revoke_role', [communityId, target]);

export const getRole = (c: Client, addr: string, communityId: string, target: string) =>
	view<Role>(c, addr, 'get_role', [communityId, target]);

// ---------------------------------------------------------------------------
// 5. Constitution drafting and activation
// ---------------------------------------------------------------------------

export const createConstitutionDraft = (c: Client, addr: string, communityId: string) =>
	write(c, addr, 'create_constitution_draft', [communityId]);

export interface AddRuleInput {
	ruleId: string;
	title: string;
	definition: string;
	category: string;
	exceptions: string[];
	contextRequired: boolean;
	evidencePolicy: string;
}

export const addRule = (c: Client, addr: string, communityId: string, version: number, r: AddRuleInput) =>
	write(c, addr, 'add_rule', [
		communityId,
		version,
		r.ruleId,
		r.title,
		r.definition,
		r.category,
		r.exceptions,
		r.contextRequired,
		r.evidencePolicy,
	]);

export const activateConstitution = (c: Client, addr: string, communityId: string, version: number) =>
	write(c, addr, 'activate_constitution', [communityId, version]);

export const getConstitution = (c: Client, addr: string, communityId: string, version: number) =>
	view<Constitution>(c, addr, 'get_constitution', [communityId, version]);

export const getActiveConstitutionVersion = (c: Client, addr: string, communityId: string) =>
	view<number>(c, addr, 'get_active_constitution_version', [communityId]);

// ---------------------------------------------------------------------------
// 6/7/8. Case creation, context, evidence
// ---------------------------------------------------------------------------

export const createCase = (c: Client, addr: string, communityId: string, content: string) =>
	write(c, addr, 'create_case', [communityId, content]);

export const getCase = (c: Client, addr: string, caseId: string) => view<Case>(c, addr, 'get_case', [caseId]);

export const addContext = (c: Client, addr: string, caseId: string, kind: string, content: string) =>
	write(c, addr, 'add_context', [caseId, kind, content]);

export const getContext = (c: Client, addr: string, caseId: string) =>
	view<ContextItem[]>(c, addr, 'get_context', [caseId]);

export interface SubmitEvidenceInput {
	evidenceType: 'TEXT' | 'WEB_LINK' | 'DOCUMENT' | 'IMAGE';
	reference: string;
	sourceCategory: string;
	representation?: 'HTML_TEXT' | 'IMAGE' | 'UNSUPPORTED_FORMAT' | '';
}

export const submitEvidence = (c: Client, addr: string, caseId: string, e: SubmitEvidenceInput) =>
	write(c, addr, 'submit_evidence', [caseId, e.evidenceType, e.reference, e.sourceCategory, e.representation ?? '']);

export const getEvidence = (c: Client, addr: string, caseId: string, evidenceId: string) =>
	view<Evidence>(c, addr, 'get_evidence', [caseId, evidenceId]);

export const listEvidence = (c: Client, addr: string, caseId: string) =>
	view<string[]>(c, addr, 'list_evidence', [caseId]);

// ---------------------------------------------------------------------------
// Evidence acquisition (validator-side, nondeterministic; permissionless)
// ---------------------------------------------------------------------------

export const acquireEvidence = (c: Client, addr: string, caseId: string, evidenceId: string) =>
	write(c, addr, 'acquire_evidence', [caseId, evidenceId]);

// ---------------------------------------------------------------------------
// 9/10. Freeze + state machine
// ---------------------------------------------------------------------------

export const freezeCase = (c: Client, addr: string, caseId: string) => write(c, addr, 'freeze_case', [caseId]);

export const getCaseState = (c: Client, addr: string, caseId: string) =>
	view<Case['state']>(c, addr, 'get_case_state', [caseId]);

// ---------------------------------------------------------------------------
// Semantic adjudication (permissionless)
// ---------------------------------------------------------------------------

export const adjudicateCase = (c: Client, addr: string, caseId: string) =>
	write(c, addr, 'adjudicate_case', [caseId]);

// ---------------------------------------------------------------------------
// Challenges, deadlines, finality, liveness
// ---------------------------------------------------------------------------

export const fileChallenge = (c: Client, addr: string, caseId: string, reason: string) =>
	write(c, addr, 'file_challenge', [caseId, reason]);

export const resolveChallenge = (c: Client, addr: string, caseId: string) =>
	write(c, addr, 'resolve_challenge', [caseId]);

export const finalizeCase = (c: Client, addr: string, caseId: string) =>
	write(c, addr, 'finalize_case', [caseId]);

// ---------------------------------------------------------------------------
// Receipts, history, precedent, Fairness Mirror, transparency
// ---------------------------------------------------------------------------

export const getModerationReceipt = (c: Client, addr: string, caseId: string) =>
	view<ModerationReceipt>(c, addr, 'get_moderation_receipt', [caseId]);

export const getCommunityCases = (c: Client, addr: string, communityId: string, offset: number, limit: number) =>
	view<Case[]>(c, addr, 'get_community_cases', [communityId, offset, limit]);

export const getCommunityStats = (c: Client, addr: string, communityId: string) =>
	view<CommunityStats>(c, addr, 'get_community_stats', [communityId]);

export const getCasePrecedents = (c: Client, addr: string, communityId: string, ruleId: string, limit: number) =>
	view<CasePrecedent[]>(c, addr, 'get_case_precedents', [communityId, ruleId, limit]);

export const runFairnessMirror = (c: Client, addr: string, caseId: string) =>
	write(c, addr, 'run_fairness_mirror', [caseId]);

/** Convenience guard mirroring the contract's own construction-time check — thrown before any RPC call if the address is unset/malformed. */
export function assertConfigured(addr: string): asserts addr is `0x${string}` {
	if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
		throw new FairModError('CONTRACT_NOT_CONFIGURED', 'FairMod contract address is not configured.');
	}
}
