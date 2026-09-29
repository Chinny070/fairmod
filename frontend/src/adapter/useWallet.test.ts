import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet, describeNetworkMismatch } from './useWallet';
import { STUDIONET } from '../config/network';

/**
 * Wallet edge-case coverage (Stage 7.1 Gap 6). No live wallet transaction is
 * performed anywhere in this file — every provider is an in-memory fake.
 * Manual/live-extension QA remains deferred to Stage 8/hosted verification
 * per the explicit instruction not to perform live wallet transactions this
 * pass.
 */

function fakeProvider(overrides: Partial<{ request: (args: { method: string }) => Promise<unknown> }> = {}) {
	const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
	return {
		request: overrides.request ?? vi.fn(),
		on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
			(listeners[event] ??= []).push(cb);
		}),
		removeListener: vi.fn(),
		__emit: (event: string, ...args: unknown[]) => listeners[event]?.forEach((cb) => cb(...args)),
	};
}

beforeEach(() => {
	delete (window as { ethereum?: unknown }).ethereum;
});

describe('useWallet — provider absence and detection', () => {
	it('reports WALLET_NOT_FOUND and status not_found when no injected provider exists', async () => {
		const { result } = renderHook(() => useWallet());
		await act(async () => {
			await result.current.connect();
		});
		expect(result.current.status).toBe('not_found');
		expect(result.current.error?.code).toBe('WALLET_NOT_FOUND');
	});

	it('provides a working read-only client even with no provider (public browsing never requires a wallet)', () => {
		const { result } = renderHook(() => useWallet());
		expect(result.current.client).toBeDefined();
		expect(result.current.status).toBe('disconnected');
	});
});

describe('useWallet — connection outcomes', () => {
	it('connects successfully on StudioNet and reports status=connected', async () => {
		const provider = fakeProvider({
			request: vi.fn(async (args: { method: string }) => {
				if (args.method === 'eth_requestAccounts') return ['0x1111111111111111111111111111111111111111'];
				if (args.method === 'eth_chainId') return `0x${STUDIONET.chainId.toString(16)}`;
				return null;
			}),
		});
		window.ethereum = provider as never;

		const { result } = renderHook(() => useWallet());
		await act(async () => {
			await result.current.connect();
		});

		await waitFor(() => expect(result.current.status).toBe('connected'));
		expect(result.current.address).toBe('0x1111111111111111111111111111111111111111');
		expect(result.current.chainId).toBe(STUDIONET.chainId);
	});

	it('reports wrong_network when the connected chain is not StudioNet — writes must not be enabled here', async () => {
		const provider = fakeProvider({
			request: vi.fn(async (args: { method: string }) => {
				if (args.method === 'eth_requestAccounts') return ['0x1111111111111111111111111111111111111111'];
				if (args.method === 'eth_chainId') return '0x1'; // mainnet, not StudioNet
				return null;
			}),
		});
		window.ethereum = provider as never;

		const { result } = renderHook(() => useWallet());
		await act(async () => {
			await result.current.connect();
		});

		await waitFor(() => expect(result.current.status).toBe('wrong_network'));
		expect(describeNetworkMismatch(result.current.chainId)).toMatch(/not StudioNet/);
	});

	it('reports WALLET_REJECTED when eth_requestAccounts returns no accounts (user closed the prompt)', async () => {
		const provider = fakeProvider({
			request: vi.fn(async (args: { method: string }) => {
				if (args.method === 'eth_requestAccounts') return [];
				return null;
			}),
		});
		window.ethereum = provider as never;

		const { result } = renderHook(() => useWallet());
		await act(async () => {
			await result.current.connect();
		});

		expect(result.current.status).toBe('disconnected');
		expect(result.current.error?.code).toBe('WALLET_REJECTED');
	});

	it('normalizes a malformed/rejecting provider error rather than crashing the hook', async () => {
		const provider = fakeProvider({
			request: vi.fn().mockRejectedValue(new Error('User rejected the request.')),
		});
		window.ethereum = provider as never;

		const { result } = renderHook(() => useWallet());
		await act(async () => {
			await result.current.connect();
		});

		expect(result.current.status).toBe('disconnected');
		expect(result.current.error?.code).toBe('WALLET_REJECTED');
	});
});

describe('useWallet — account and chain change events', () => {
	async function connected() {
		const provider = fakeProvider({
			request: vi.fn(async (args: { method: string }) => {
				if (args.method === 'eth_requestAccounts') return ['0x1111111111111111111111111111111111111111'];
				if (args.method === 'eth_chainId') return `0x${STUDIONET.chainId.toString(16)}`;
				return null;
			}),
		});
		window.ethereum = provider as never;
		const { result } = renderHook(() => useWallet());
		await act(async () => {
			await result.current.connect();
		});
		await waitFor(() => expect(result.current.status).toBe('connected'));
		return { result, provider };
	}

	it('updates the address when accountsChanged fires with a new account', async () => {
		const { result, provider } = await connected();
		act(() => {
			provider.__emit('accountsChanged', ['0x2222222222222222222222222222222222222222']);
		});
		await waitFor(() => expect(result.current.address).toBe('0x2222222222222222222222222222222222222222'));
	});

	it('disconnects (disconnect-like behavior) when accountsChanged fires with an empty array', async () => {
		const { result, provider } = await connected();
		act(() => {
			provider.__emit('accountsChanged', []);
		});
		await waitFor(() => expect(result.current.status).toBe('disconnected'));
		expect(result.current.address).toBeUndefined();
	});

	it('re-evaluates network status when chainChanged fires to a non-StudioNet chain', async () => {
		const { result, provider } = await connected();
		provider.request = vi.fn(async (args: { method: string }) => (args.method === 'eth_chainId' ? '0x1' : null));
		act(() => {
			provider.__emit('chainChanged', '0x1');
		});
		await waitFor(() => expect(result.current.status).toBe('wrong_network'));
	});
});

describe('useWallet — disconnect', () => {
	it('clears address/chainId and falls back to a read-only client', async () => {
		const provider = fakeProvider({
			request: vi.fn(async (args: { method: string }) => {
				if (args.method === 'eth_requestAccounts') return ['0x1111111111111111111111111111111111111111'];
				if (args.method === 'eth_chainId') return `0x${STUDIONET.chainId.toString(16)}`;
				return null;
			}),
		});
		window.ethereum = provider as never;
		const { result } = renderHook(() => useWallet());
		await act(async () => {
			await result.current.connect();
		});
		await waitFor(() => expect(result.current.status).toBe('connected'));

		act(() => result.current.disconnect());
		expect(result.current.status).toBe('disconnected');
		expect(result.current.address).toBeUndefined();
		expect(result.current.chainId).toBeUndefined();
	});
});
