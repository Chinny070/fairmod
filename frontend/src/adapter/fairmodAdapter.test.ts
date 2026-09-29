import { describe, it, expect, vi } from 'vitest';
import {
	createCommunity,
	getCommunity,
	grantRole,
	submitEvidence,
	adjudicateCase,
	getCommunityCases,
	getCasePrecedents,
} from './fairmodAdapter';
import { FairModError } from '../domain/errors';

const ADDRESS = '0x1234567890123456789012345678901234567890';

function makeMockClient() {
	return {
		readContract: vi.fn(),
		writeContract: vi.fn(),
	} as unknown as Parameters<typeof getCommunity>[0] & {
		readContract: ReturnType<typeof vi.fn>;
		writeContract: ReturnType<typeof vi.fn>;
	};
}

describe('fairmodAdapter — exact boundary contract with genlayer-js', () => {
	it('create_community: calls writeContract with exact functionName/args/value, no fees object', async () => {
		const client = makeMockClient();
		client.writeContract.mockResolvedValue('0xhash');
		await createCommunity(client, ADDRESS, 'Test Community', 'a description');

		expect(client.writeContract).toHaveBeenCalledTimes(1);
		const call = client.writeContract.mock.calls[0][0];
		expect(call.address).toBe(ADDRESS);
		expect(call.functionName).toBe('create_community');
		expect(call.args).toEqual(['Test Community', 'a description']);
		expect(call.value).toBe(0n);
		expect(call).not.toHaveProperty('fees');
	});

	it('get_community: calls readContract with exact functionName/args and returns its result', async () => {
		const client = makeMockClient();
		const fakeCommunity = { community_id: 'c0', owner: '0xabc', created_at: '', name: 'X', metadata: '', status: 'ACTIVE', active_constitution_version: 1, case_counter: 0 };
		client.readContract.mockResolvedValue(fakeCommunity);

		const result = await getCommunity(client, ADDRESS, 'c0');

		expect(client.readContract).toHaveBeenCalledWith({ address: ADDRESS, functionName: 'get_community', args: ['c0'] });
		expect(result).toBe(fakeCommunity);
	});

	it('grant_role: forwards community_id, target, role in the exact declared order', async () => {
		const client = makeMockClient();
		client.writeContract.mockResolvedValue('0xhash');
		await grantRole(client, ADDRESS, 'c0', '0xdeadbeef00000000000000000000000000000000', 'MODERATOR');

		const call = client.writeContract.mock.calls[0][0];
		expect(call.functionName).toBe('grant_role');
		expect(call.args).toEqual(['c0', '0xdeadbeef00000000000000000000000000000000', 'MODERATOR']);
	});

	it('submit_evidence: passes representation as empty string default when omitted (matches contract default)', async () => {
		const client = makeMockClient();
		client.writeContract.mockResolvedValue('0xhash');
		await submitEvidence(client, ADDRESS, 'c0#0', { evidenceType: 'TEXT', reference: 'hello', sourceCategory: '' });

		const call = client.writeContract.mock.calls[0][0];
		expect(call.functionName).toBe('submit_evidence');
		expect(call.args).toEqual(['c0#0', 'TEXT', 'hello', '', '']);
	});

	it('adjudicate_case: takes only case_id, no caller-suppliable verdict field exists on the call boundary', async () => {
		const client = makeMockClient();
		client.writeContract.mockResolvedValue('0xhash');
		await adjudicateCase(client, ADDRESS, 'c0#0');

		const call = client.writeContract.mock.calls[0][0];
		expect(call.functionName).toBe('adjudicate_case');
		expect(call.args).toEqual(['c0#0']);
	});

	it('get_community_cases: forwards offset/limit exactly, does not silently clamp client-side', async () => {
		const client = makeMockClient();
		client.readContract.mockResolvedValue([]);
		await getCommunityCases(client, ADDRESS, 'c0', 10, 50);

		expect(client.readContract).toHaveBeenCalledWith({ address: ADDRESS, functionName: 'get_community_cases', args: ['c0', 10, 50] });
	});

	it('get_case_precedents: forwards rule_id and limit exactly', async () => {
		const client = makeMockClient();
		client.readContract.mockResolvedValue([]);
		await getCasePrecedents(client, ADDRESS, 'c0', 'HARASSMENT', 20);

		expect(client.readContract).toHaveBeenCalledWith({ address: ADDRESS, functionName: 'get_case_precedents', args: ['c0', 'HARASSMENT', 20] });
	});

	it('refuses to call out when no valid contract address is configured (CONTRACT_NOT_CONFIGURED)', async () => {
		const client = makeMockClient();
		await expect(getCommunity(client, '', 'c0')).rejects.toMatchObject({ code: 'CONTRACT_NOT_CONFIGURED' } satisfies Partial<FairModError>);
		expect(client.readContract).not.toHaveBeenCalled();
	});

	it('normalizes a readContract rejection through the FairMod error taxonomy rather than throwing the raw SDK error', async () => {
		const client = makeMockClient();
		client.readContract.mockRejectedValue(new Error('community does not exist'));
		await expect(getCommunity(client, ADDRESS, 'nope')).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
	});
});
