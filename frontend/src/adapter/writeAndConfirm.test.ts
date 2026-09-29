import { describe, it, expect, vi } from 'vitest';
import { writeAndConfirm } from './writeAndConfirm';
import * as txLifecycle from './txLifecycle';

const HASH = '0xabc0000000000000000000000000000000000000000000000000000000000';

function mockObservation(overrides: Partial<txLifecycle.TxObservation> = {}): txLifecycle.TxObservation {
	return {
		hash: HASH,
		phase: 'protocol_finalized',
		statusName: undefined,
		executionSucceeded: true,
		raw: {} as never,
		...overrides,
	};
}

describe('writeAndConfirm — the anti-false-positive pipeline', () => {
	it('reports applicationConfirmed=true only when the reread satisfies the expectation, even after protocol finality', async () => {
		vi.spyOn(txLifecycle, 'observeTransaction').mockResolvedValue(mockObservation());
		const submit = vi.fn().mockResolvedValue(HASH);
		const reread = vi.fn().mockResolvedValue({ state: 'DECIDED' });

		const result = await writeAndConfirm({} as never, submit, reread, (s: { state: string }) => s.state === 'DECIDED');

		expect(result.applicationConfirmed).toBe(true);
		expect(reread).toHaveBeenCalledTimes(1);
	});

	it('reports applicationConfirmed=false when protocol reached FINALIZED but the expected state transition did not occur — the exact Stage 2H/cleanroom failure shape', async () => {
		vi.spyOn(txLifecycle, 'observeTransaction').mockResolvedValue(
			mockObservation({ phase: 'execution_error', executionSucceeded: false }),
		);
		const submit = vi.fn().mockResolvedValue(HASH);
		const reread = vi.fn().mockResolvedValue({ state: 'OPEN' }); // unchanged

		const result = await writeAndConfirm({} as never, submit, reread, (s: { state: string }) => s.state === 'EVIDENCE_FROZEN');

		expect(result.applicationConfirmed).toBe(false);
		expect(result.observation.phase).toBe('execution_error');
	});

	it('always calls reread, never skipping it because a hash or FINALIZED status was returned', async () => {
		vi.spyOn(txLifecycle, 'observeTransaction').mockResolvedValue(mockObservation());
		const submit = vi.fn().mockResolvedValue(HASH);
		const reread = vi.fn().mockResolvedValue({ state: 'X' });

		await writeAndConfirm({} as never, submit, reread, () => true);

		expect(reread).toHaveBeenCalled();
	});

	it('normalizes a reread failure to STATE_NOT_CONFIRMED rather than swallowing it', async () => {
		vi.spyOn(txLifecycle, 'observeTransaction').mockResolvedValue(mockObservation());
		const submit = vi.fn().mockResolvedValue(HASH);
		const reread = vi.fn().mockRejectedValue(new Error('rpc down'));

		await expect(writeAndConfirm({} as never, submit, reread, () => true)).rejects.toMatchObject({ code: 'STATE_NOT_CONFIRMED' });
	});
});
