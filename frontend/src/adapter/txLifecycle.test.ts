import { describe, it, expect, vi } from 'vitest';
import { observeTransaction } from './txLifecycle';
import { TransactionStatus } from 'genlayer-js/types';

const HASH = '0xabc0000000000000000000000000000000000000000000000000000000000' as const;

function client(waitResult: unknown) {
	return { waitForTransactionReceipt: vi.fn().mockResolvedValue(waitResult) } as never;
}

describe('observeTransaction', () => {
	it('reports protocol_finalized with executionSucceeded=true when every leader receipt succeeded', async () => {
		const obs = await observeTransaction(
			client({ statusName: TransactionStatus.FINALIZED, consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] } }),
			HASH,
		);
		expect(obs.phase).toBe('protocol_finalized');
		expect(obs.executionSucceeded).toBe(true);
	});

	it('reports execution_error even though the transaction is FINALIZED — the exact Stage 2H/cleanroom-probe signature', async () => {
		const obs = await observeTransaction(
			client({ statusName: TransactionStatus.FINALIZED, consensus_data: { leader_receipt: [{ execution_result: 'ERROR' }] } }),
			HASH,
		);
		expect(obs.phase).toBe('execution_error');
		expect(obs.executionSucceeded).toBe(false);
	});

	it('reports undetermined for UNDETERMINED status', async () => {
		const obs = await observeTransaction(client({ statusName: TransactionStatus.UNDETERMINED, consensus_data: {} }), HASH);
		expect(obs.phase).toBe('undetermined');
	});

	it('reports timeout for VALIDATORS_TIMEOUT / LEADER_TIMEOUT', async () => {
		const a = await observeTransaction(client({ statusName: TransactionStatus.VALIDATORS_TIMEOUT, consensus_data: {} }), HASH);
		const b = await observeTransaction(client({ statusName: TransactionStatus.LEADER_TIMEOUT, consensus_data: {} }), HASH);
		expect(a.phase).toBe('timeout');
		expect(b.phase).toBe('timeout');
	});

	it('reports canceled for CANCELED status', async () => {
		const obs = await observeTransaction(client({ statusName: TransactionStatus.CANCELED, consensus_data: {} }), HASH);
		expect(obs.phase).toBe('canceled');
	});

	it('normalizes a thrown error from waitForTransactionReceipt (e.g. retry exhaustion)', async () => {
		const failingClient = { waitForTransactionReceipt: vi.fn().mockRejectedValue(new Error('timeout')) } as never;
		await expect(observeTransaction(failingClient, HASH)).rejects.toMatchObject({ code: 'RPC_FAILURE' });
	});
});
