# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# FairMod — Stage 1: deterministic multi-community moderation protocol core.
#
# Stage 1 hard boundary (see docs/ARCHITECTURE.md, docs/GENVM_API_VERIFICATION.md):
#   - No gl.nondet.* calls of any kind (no web.get/request/render, no exec_prompt).
#   - No gl.eq_principle usage.
#   - No semantic verdict logic (ALLOWED/FLAGGED/NEEDS_REVIEW are NOT decided here).
#   - No caller can force a case into DECIDED/CHALLENGE_WINDOW/CHALLENGED/FINAL —
#     those transitions require Stage 3/4 consensus/challenge logic that does not exist yet.
#   - Only deterministic state, authority, isolation, versioning, freezing and bounds.
#
# GenVM header pin: matches the exact embedded-runtime build read and source-verified
# during Stage 0 (see docs/GENVM_API_VERIFICATION.md) — not "latest".

from dataclasses import dataclass

from genlayer import *


# ---------------------------------------------------------------------------
# Resource bounds (Stage 1 requirement #12: every bound must be justified)
# ---------------------------------------------------------------------------

MAX_NAME_LEN = 80          # community/rule title display fields — short, human-scannable
MAX_METADATA_LEN = 500     # community description — enough for a short paragraph, not a document
MAX_RULE_ID_LEN = 40       # logical rule keys are short symbolic tokens (e.g. "HARASSMENT")
MAX_RULE_DEFINITION_LEN = 2000  # semantic definition text the future adjudicator reasons over
MAX_RULE_EXCEPTION_LEN = 300
MAX_RULE_EXCEPTIONS = 10
MAX_EVIDENCE_POLICY_LEN = 200
MAX_RULES_PER_CONSTITUTION = 50   # bounds the adjudication prompt size in a later stage
MAX_MODERATORS_PER_COMMUNITY = 50
MAX_CASE_CONTENT_LEN = 4000        # reported message/content bound
MAX_CONTEXT_ITEMS = 10
MAX_CONTEXT_ITEM_LEN = 2000
MAX_EVIDENCE_PER_CASE = 20
MAX_EVIDENCE_REFERENCE_LEN = 2000  # URL/reference length
MAX_EVIDENCE_SOURCE_CATEGORY_LEN = 60

# Roles
ROLE_OWNER = 'OWNER'
ROLE_ADMIN = 'ADMIN'
ROLE_MODERATOR = 'MODERATOR'
VALID_ROLES = (ROLE_ADMIN, ROLE_MODERATOR)  # OWNER is not "granted", it's the creator

# Community status
COMMUNITY_ACTIVE = 'ACTIVE'

# Constitution status
CONSTITUTION_DRAFT = 'DRAFT'
CONSTITUTION_ACTIVE = 'ACTIVE'
CONSTITUTION_RETIRED = 'RETIRED'

# Evidence types (TEXT/WEB_LINK fully usable at the record layer in Stage 1;
# DOCUMENT/IMAGE are reserved per docs/EVIDENCE_CAPABILITY_MATRIX.md — the record
# layer accepts them as metadata only, retrieval/interpretation is Stage 2/2A/3).
EVIDENCE_TYPE_TEXT = 'TEXT'
EVIDENCE_TYPE_WEB_LINK = 'WEB_LINK'
EVIDENCE_TYPE_DOCUMENT = 'DOCUMENT'
EVIDENCE_TYPE_IMAGE = 'IMAGE'
VALID_EVIDENCE_TYPES = (
	EVIDENCE_TYPE_TEXT,
	EVIDENCE_TYPE_WEB_LINK,
	EVIDENCE_TYPE_DOCUMENT,
	EVIDENCE_TYPE_IMAGE,
)

EVIDENCE_RETRIEVAL_NOT_APPLICABLE = 'NOT_APPLICABLE'  # TEXT: nothing to retrieve
EVIDENCE_RETRIEVAL_PENDING = 'PENDING'                 # WEB_LINK/DOCUMENT/IMAGE: reserved for Stage 2/2A

# Case state machine — Stage 1 only implements the prefix that can exist without
# Stage 3 (adjudication) or Stage 4 (challenges). Later states are documented but
# deliberately unreachable from any Stage 1 public method (see docs/STATE_MACHINE.md
# and Stage 1 report section "future transitions intentionally unavailable").
CASE_OPEN = 'OPEN'
CASE_EVIDENCE_FROZEN = 'EVIDENCE_FROZEN'
# Not reachable in Stage 1: ADJUDICATING, DECIDED, NEEDS_REVIEW, CHALLENGE_WINDOW,
# CHALLENGED, CHALLENGE_DECIDED, FINAL.


def _require(condition: bool, message: str) -> None:
	if not condition:
		raise Exception(message)


def _now() -> str:
	"""
	Deterministic GenVM transaction time.

	Stage 0 finding, reconfirmed in Stage 1 (see docs/STAGE_1_VERIFICATION.md,
	"GenVM API generation divergence"): the pinned generation used here (the
	`gl.Contract` / `from genlayer import *` generation, matched by the installed
	genlayer-test/gltest tooling's own contract-discovery AST and by the official
	`genlayer new` scaffold) does NOT expose `datetime` on the convenience
	`gl.message` NamedTuple — only the raw message dict does.
	"""
	return gl.message_raw['datetime']


def _bounded_str(value: str, field_name: str, max_len: int, *, allow_empty: bool = False) -> str:
	_require(isinstance(value, str), f'{field_name} must be a string')
	if not allow_empty:
		_require(len(value) > 0, f'{field_name} must not be empty')
	_require(len(value) <= max_len, f'{field_name} exceeds max length {max_len}')
	return value


@allow_storage
@dataclass
class Community:
	community_id: str
	owner: Address
	created_at: str
	name: str
	metadata: str
	status: str
	active_constitution_version: u256
	next_constitution_version: u256
	case_counter: u256


@allow_storage
@dataclass
class RuleRevision:
	rule_id: str
	title: str
	definition: str
	category: str
	exceptions: DynArray[str]
	context_required: bool
	evidence_policy: str


@allow_storage
@dataclass
class Constitution:
	community_id: str
	version: u256
	status: str
	created_at: str
	activated_at: str
	retired_at: str
	rules: TreeMap[str, RuleRevision]
	rule_order: DynArray[str]  # deterministic enumeration order for rule_ids


@allow_storage
@dataclass
class ContextItem:
	kind: str
	content: str
	added_at: str


@allow_storage
@dataclass
class Evidence:
	evidence_id: str
	case_id: str
	community_id: str
	submitter: Address
	evidence_type: str
	reference: str
	source_category: str
	submitted_at: str
	frozen: bool
	retrieval_status: str
	fingerprint: str  # placeholder field for Stage 2/2A provenance; empty in Stage 1


@allow_storage
@dataclass
class Case:
	case_id: str
	community_id: str
	reporter: Address
	created_at: str
	constitution_version: u256
	content: str
	state: str
	frozen_at: str
	evidence_count: u256
	context_count: u256


class FairMod(gl.Contract):
	# Registries
	communities: TreeMap[str, Community]
	community_order: DynArray[str]
	community_counter: u256

	# roles[community_id][address_hex] = role string
	roles: TreeMap[str, TreeMap[str, str]]

	# constitutions[community_id][version] = Constitution
	constitutions: TreeMap[str, TreeMap[u256, Constitution]]

	# cases[case_id] = Case  (case_id globally unique, encodes community_id)
	cases: TreeMap[str, Case]

	# contexts[case_id] = list of ContextItem, in submission order
	contexts: TreeMap[str, DynArray[ContextItem]]

	# evidence[case_id][evidence_id] = Evidence
	evidence: TreeMap[str, TreeMap[str, Evidence]]
	evidence_order: TreeMap[str, DynArray[str]]  # case_id -> ordered evidence_ids

	def __init__(self):
		self.community_counter = u256(0)

	# ------------------------------------------------------------------
	# Internal helpers
	# ------------------------------------------------------------------

	def _get_community(self, community_id: str) -> Community:
		_require(community_id in self.communities, 'community does not exist')
		return self.communities[community_id]

	def _role_of(self, community_id: str, addr: Address) -> str:
		community = self._get_community(community_id)
		if addr == community.owner:
			return ROLE_OWNER
		community_roles = self.roles.get(community_id, None)
		if community_roles is None:
			return ''
		return community_roles.get(addr.as_hex, '')

	def _require_role(self, community_id: str, addr: Address, allowed: tuple) -> str:
		role = self._role_of(community_id, addr)
		_require(role in allowed, 'caller is not authorized for this action in this community')
		return role

	def _get_case(self, case_id: str) -> Case:
		_require(case_id in self.cases, 'case does not exist')
		return self.cases[case_id]

	# ------------------------------------------------------------------
	# 2. Multi-community registry
	# ------------------------------------------------------------------

	@gl.public.write
	def create_community(self, name: str, metadata: str) -> str:
		name = _bounded_str(name, 'name', MAX_NAME_LEN)
		metadata = _bounded_str(metadata, 'metadata', MAX_METADATA_LEN, allow_empty=True)

		community_id = f'c{self.community_counter}'
		self.community_counter += u256(1)
		# Protocol-assigned counter-based ID: cannot collide, cannot be supplied by caller.
		_require(community_id not in self.communities, 'community_id collision (unreachable)')

		now = _now()
		self.communities[community_id] = Community(
			community_id=community_id,
			owner=gl.message.sender_address,
			created_at=now,
			name=name,
			metadata=metadata,
			status=COMMUNITY_ACTIVE,
			active_constitution_version=u256(0),  # 0 == "no active constitution yet"
			next_constitution_version=u256(1),
			case_counter=u256(0),
		)
		self.community_order.append(community_id)
		self.roles[community_id] = TreeMap()
		self.constitutions[community_id] = TreeMap()
		return community_id

	@gl.public.view
	def get_community(self, community_id: str) -> dict:
		c = self._get_community(community_id)
		return {
			'community_id': c.community_id,
			'owner': c.owner.as_hex,
			'created_at': c.created_at,
			'name': c.name,
			'metadata': c.metadata,
			'status': c.status,
			'active_constitution_version': int(c.active_constitution_version),
			'case_counter': int(c.case_counter),
		}

	@gl.public.view
	def list_communities(self) -> list:
		return list(self.community_order)

	# ------------------------------------------------------------------
	# 3. Authority model
	# ------------------------------------------------------------------

	@gl.public.write
	def grant_role(self, community_id: str, target: str, role: str) -> None:
		community = self._get_community(community_id)
		caller = gl.message.sender_address
		_require(caller == community.owner, 'only the community owner may grant roles')
		_require(role in VALID_ROLES, f'role must be one of {VALID_ROLES}')

		target_addr = Address(target)
		_require(target_addr != community.owner, 'owner role is implicit and cannot be granted/duplicated')

		community_roles = self.roles[community_id]
		existing = community_roles.get(target_addr.as_hex, '')
		if existing == role:
			return  # idempotent no-op: granting the same role twice is a no-op, not an error
		_require(
			len(community_roles) < MAX_MODERATORS_PER_COMMUNITY or target_addr.as_hex in community_roles,
			f'community has reached the maximum of {MAX_MODERATORS_PER_COMMUNITY} role holders',
		)
		community_roles[target_addr.as_hex] = role

	@gl.public.write
	def revoke_role(self, community_id: str, target: str) -> None:
		community = self._get_community(community_id)
		caller = gl.message.sender_address
		_require(caller == community.owner, 'only the community owner may revoke roles')

		target_addr = Address(target)
		community_roles = self.roles[community_id]
		if target_addr.as_hex in community_roles:
			del community_roles[target_addr.as_hex]
		# Revoking a role that was never granted is a safe no-op, not an error —
		# avoids leaking whether a given address ever held a role via error timing/content.

	@gl.public.view
	def get_role(self, community_id: str, target: str) -> str:
		role = self._role_of(community_id, Address(target))
		return role if role else 'NONE'

	# ------------------------------------------------------------------
	# 5. Constitution drafting and activation (stable logical Rule IDs)
	# ------------------------------------------------------------------

	@gl.public.write
	def create_constitution_draft(self, community_id: str) -> int:
		community = self._get_community(community_id)
		caller = gl.message.sender_address
		self._require_role(community_id, caller, (ROLE_OWNER, ROLE_ADMIN))

		version = community.next_constitution_version
		community.next_constitution_version += u256(1)

		now = _now()
		self.constitutions[community_id][version] = Constitution(
			community_id=community_id,
			version=version,
			status=CONSTITUTION_DRAFT,
			created_at=now,
			activated_at='',
			retired_at='',
			rules=TreeMap(),
			rule_order=DynArray(),
		)
		return int(version)

	def _get_constitution(self, community_id: str, version: int) -> Constitution:
		_require(community_id in self.constitutions, 'community does not exist')
		versions = self.constitutions[community_id]
		v = u256(version)
		_require(v in versions, 'constitution version does not exist')
		return versions[v]

	@gl.public.write
	def add_rule(
		self,
		community_id: str,
		version: int,
		rule_id: str,
		title: str,
		definition: str,
		category: str,
		exceptions: list,
		context_required: bool,
		evidence_policy: str,
	) -> None:
		community = self._get_community(community_id)
		caller = gl.message.sender_address
		self._require_role(community_id, caller, (ROLE_OWNER, ROLE_ADMIN))

		constitution = self._get_constitution(community_id, version)
		_require(constitution.status == CONSTITUTION_DRAFT, 'rules can only be added while the constitution is DRAFT')

		rule_id = _bounded_str(rule_id, 'rule_id', MAX_RULE_ID_LEN)
		_require(rule_id not in constitution.rules, f'duplicate rule_id "{rule_id}" within this constitution version')
		_require(
			len(constitution.rule_order) < MAX_RULES_PER_CONSTITUTION,
			f'constitution has reached the maximum of {MAX_RULES_PER_CONSTITUTION} rules',
		)

		title = _bounded_str(title, 'title', MAX_NAME_LEN)
		definition = _bounded_str(definition, 'definition', MAX_RULE_DEFINITION_LEN)
		category = _bounded_str(category, 'category', MAX_NAME_LEN, allow_empty=True)
		evidence_policy = _bounded_str(evidence_policy, 'evidence_policy', MAX_EVIDENCE_POLICY_LEN, allow_empty=True)

		_require(len(exceptions) <= MAX_RULE_EXCEPTIONS, f'too many exceptions (max {MAX_RULE_EXCEPTIONS})')
		bounded_exceptions = DynArray()
		for exc in exceptions:
			bounded_exceptions.append(_bounded_str(str(exc), 'exception', MAX_RULE_EXCEPTION_LEN))

		constitution.rules[rule_id] = RuleRevision(
			rule_id=rule_id,
			title=title,
			definition=definition,
			category=category,
			exceptions=bounded_exceptions,
			context_required=bool(context_required),
			evidence_policy=evidence_policy,
		)
		constitution.rule_order.append(rule_id)

	@gl.public.write
	def activate_constitution(self, community_id: str, version: int) -> None:
		community = self._get_community(community_id)
		caller = gl.message.sender_address
		self._require_role(community_id, caller, (ROLE_OWNER, ROLE_ADMIN))

		constitution = self._get_constitution(community_id, version)
		_require(constitution.status == CONSTITUTION_DRAFT, 'only a DRAFT constitution can be activated')
		_require(len(constitution.rule_order) > 0, 'cannot activate a constitution with zero rules')

		now = _now()

		# Retire the previously active version, if any. Retirement/activation are the
		# ONLY writes ever performed on a Constitution after this point in its lifecycle;
		# no method below (or anywhere else in this contract) may write into rules/status
		# of a constitution whose status != DRAFT.
		old_version = community.active_constitution_version
		if old_version != u256(0):
			old_constitution = self.constitutions[community_id][old_version]
			old_constitution.status = CONSTITUTION_RETIRED
			old_constitution.retired_at = now

		constitution.status = CONSTITUTION_ACTIVE
		constitution.activated_at = now
		community.active_constitution_version = u256(version)

	@gl.public.view
	def get_constitution(self, community_id: str, version: int) -> dict:
		constitution = self._get_constitution(community_id, version)
		rules = {}
		for rule_id in constitution.rule_order:
			r = constitution.rules[rule_id]
			rules[rule_id] = {
				'title': r.title,
				'definition': r.definition,
				'category': r.category,
				'exceptions': list(r.exceptions),
				'context_required': r.context_required,
				'evidence_policy': r.evidence_policy,
			}
		return {
			'community_id': constitution.community_id,
			'version': int(constitution.version),
			'status': constitution.status,
			'created_at': constitution.created_at,
			'activated_at': constitution.activated_at,
			'retired_at': constitution.retired_at,
			'rules': rules,
		}

	@gl.public.view
	def get_active_constitution_version(self, community_id: str) -> int:
		community = self._get_community(community_id)
		return int(community.active_constitution_version)

	# ------------------------------------------------------------------
	# 6/7/8. Case creation, context, evidence (deterministic record layer only)
	# ------------------------------------------------------------------

	@gl.public.write
	def create_case(self, community_id: str, content: str) -> str:
		community = self._get_community(community_id)
		_require(
			community.active_constitution_version != u256(0),
			'community has no active constitution; cases cannot be bound to a nonexistent version',
		)
		content = _bounded_str(content, 'content', MAX_CASE_CONTENT_LEN)

		case_id = f'{community_id}#{community.case_counter}'
		community.case_counter += u256(1)
		_require(case_id not in self.cases, 'case_id collision (unreachable)')

		now = _now()
		self.cases[case_id] = Case(
			case_id=case_id,
			community_id=community_id,
			reporter=gl.message.sender_address,
			created_at=now,
			# Bind to the community's active version AT CREATION TIME. A later
			# constitution activation must never retroactively change this case's binding.
			constitution_version=community.active_constitution_version,
			content=content,
			state=CASE_OPEN,
			frozen_at='',
			evidence_count=u256(0),
			context_count=u256(0),
		)
		self.contexts[case_id] = DynArray()
		self.evidence[case_id] = TreeMap()
		self.evidence_order[case_id] = DynArray()
		return case_id

	@gl.public.view
	def get_case(self, case_id: str) -> dict:
		c = self._get_case(case_id)
		return {
			'case_id': c.case_id,
			'community_id': c.community_id,
			'reporter': c.reporter.as_hex,
			'created_at': c.created_at,
			'constitution_version': int(c.constitution_version),
			'content': c.content,
			'state': c.state,
			'frozen_at': c.frozen_at,
			'evidence_count': int(c.evidence_count),
			'context_count': int(c.context_count),
		}

	@gl.public.write
	def add_context(self, case_id: str, kind: str, content: str) -> None:
		case = self._get_case(case_id)
		_require(case.state == CASE_OPEN, 'context can only be added while the case is OPEN (pre-freeze)')

		kind = _bounded_str(kind, 'kind', MAX_NAME_LEN)
		content = _bounded_str(content, 'content', MAX_CONTEXT_ITEM_LEN)

		items = self.contexts[case_id]
		_require(len(items) < MAX_CONTEXT_ITEMS, f'case has reached the maximum of {MAX_CONTEXT_ITEMS} context items')

		items.append(ContextItem(kind=kind, content=content, added_at=_now()))
		case.context_count += u256(1)

	@gl.public.view
	def get_context(self, case_id: str) -> list:
		_require(case_id in self.contexts, 'case does not exist')
		return [
			{'kind': item.kind, 'content': item.content, 'added_at': item.added_at}
			for item in self.contexts[case_id]
		]

	@gl.public.write
	def submit_evidence(
		self,
		case_id: str,
		evidence_type: str,
		reference: str,
		source_category: str,
	) -> str:
		case = self._get_case(case_id)
		_require(case.state == CASE_OPEN, 'evidence can only be submitted while the case is OPEN (pre-freeze)')
		_require(evidence_type in VALID_EVIDENCE_TYPES, f'evidence_type must be one of {VALID_EVIDENCE_TYPES}')

		if evidence_type == EVIDENCE_TYPE_TEXT:
			reference = _bounded_str(reference, 'reference', MAX_EVIDENCE_REFERENCE_LEN, allow_empty=True)
			retrieval_status = EVIDENCE_RETRIEVAL_NOT_APPLICABLE
		else:
			# WEB_LINK/DOCUMENT/IMAGE: store the reference only. Stage 1 does NOT
			# validate reachability, fetch content, or claim GenLayer has verified
			# this URL in any way — that is Stage 2/2A's job, and only via
			# gl.nondet.web.* / gl.nondet.exec_prompt executed by consensus,
			# never implied here by the mere act of storing a string.
			reference = _bounded_str(reference, 'reference', MAX_EVIDENCE_REFERENCE_LEN)
			retrieval_status = EVIDENCE_RETRIEVAL_PENDING

		source_category = _bounded_str(source_category, 'source_category', MAX_EVIDENCE_SOURCE_CATEGORY_LEN, allow_empty=True)

		case_evidence = self.evidence[case_id]
		_require(
			len(case_evidence) < MAX_EVIDENCE_PER_CASE,
			f'case has reached the maximum of {MAX_EVIDENCE_PER_CASE} evidence items',
		)

		evidence_id = f'{case_id}:e{len(case_evidence)}'
		_require(evidence_id not in case_evidence, 'evidence_id collision (unreachable)')

		case_evidence[evidence_id] = Evidence(
			evidence_id=evidence_id,
			case_id=case_id,
			community_id=case.community_id,
			submitter=gl.message.sender_address,
			evidence_type=evidence_type,
			reference=reference,
			source_category=source_category,
			submitted_at=_now(),
			frozen=False,
			retrieval_status=retrieval_status,
			fingerprint='',
		)
		self.evidence_order[case_id].append(evidence_id)
		case.evidence_count += u256(1)
		return evidence_id

	@gl.public.view
	def get_evidence(self, case_id: str, evidence_id: str) -> dict:
		_require(case_id in self.evidence, 'case does not exist')
		case_evidence = self.evidence[case_id]
		# Cross-case reference is structurally impossible here: evidence_id is only
		# looked up inside the TreeMap for the exact case_id the caller supplied, and
		# evidence_ids are minted as f'{case_id}:e{n}', so an evidence_id from case A
		# looked up under case B's map will simply not be present.
		_require(evidence_id in case_evidence, 'evidence does not exist for this case')
		e = case_evidence[evidence_id]
		return {
			'evidence_id': e.evidence_id,
			'case_id': e.case_id,
			'community_id': e.community_id,
			'submitter': e.submitter.as_hex,
			'evidence_type': e.evidence_type,
			'reference': e.reference,
			'source_category': e.source_category,
			'submitted_at': e.submitted_at,
			'frozen': e.frozen,
			'retrieval_status': e.retrieval_status,
			'fingerprint': e.fingerprint,
		}

	@gl.public.view
	def list_evidence(self, case_id: str) -> list:
		_require(case_id in self.evidence_order, 'case does not exist')
		return list(self.evidence_order[case_id])

	# ------------------------------------------------------------------
	# 9/10. Freeze semantics and state machine (Stage 1 boundary)
	# ------------------------------------------------------------------

	@gl.public.write
	def freeze_case(self, case_id: str) -> None:
		"""
		Freeze a case's content, context and evidence set.

		Authorization: the reporter who opened the case, or an OWNER/ADMIN/MODERATOR
		of the case's own community, may freeze it. No other address may freeze
		someone else's case, and a community's authority never extends to another
		community's cases (enforced by deriving the required role from
		case.community_id, never from a caller-supplied community_id).

		This is intentionally the LAST public transition Stage 1 exposes. Stage 1
		does not implement request_adjudication, and no method anywhere in this
		contract can move a case to ADJUDICATING/DECIDED/NEEDS_REVIEW/
		CHALLENGE_WINDOW/CHALLENGED/CHALLENGE_DECIDED/FINAL — those require Stage 3
		(GenLayer consensus) and Stage 4 (challenges), which do not exist yet, and
		exposing a public method that let any caller set those states directly would
		let a caller manufacture a verdict, which the threat model forbids.
		"""
		case = self._get_case(case_id)
		_require(case.state == CASE_OPEN, 'only an OPEN case can be frozen (freeze is not repeatable)')

		caller = gl.message.sender_address
		is_reporter = caller == case.reporter
		if not is_reporter:
			self._require_role(case.community_id, caller, (ROLE_OWNER, ROLE_ADMIN, ROLE_MODERATOR))

		case.state = CASE_EVIDENCE_FROZEN
		case.frozen_at = _now()

		for evidence_id in self.evidence_order[case_id]:
			self.evidence[case_id][evidence_id].frozen = True

	@gl.public.view
	def get_case_state(self, case_id: str) -> str:
		return self._get_case(case_id).state
