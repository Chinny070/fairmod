/**
 * GenLayer client factory. Verified against the ACTUAL installed
 * genlayer-js@1.1.8 package (node_modules/genlayer-js/dist/index.d.ts and
 * index-C3Ul1Rte.d.ts) — createClient's config shape, chains.studionet, and
 * every method used below (readContract/writeContract/getTransaction/
 * waitForTransactionReceipt/getContractSchema/getContractCode/canAppeal/
 * finalizeTransaction/getRoundNumber/getRoundData/getLastRoundData/
 * getTriggeredTransactionIds) were all read directly from that installed
 * source, not assumed. No genlayer-js 2.x/RC API is used anywhere.
 */
import { createClient, chains } from 'genlayer-js';
import type { GenLayerClient } from 'genlayer-js/types';
import { STUDIONET } from '../config/network';
import { FairModError } from '../domain/errors';

export interface EthereumProvider {
	request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
	on?: (event: string, listener: (...args: unknown[]) => void) => void;
	removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
	interface Window {
		ethereum?: EthereumProvider;
	}
}

export function detectInjectedProvider(): EthereumProvider | undefined {
	if (typeof window === 'undefined') return undefined;
	return window.ethereum;
}

/**
 * Creates a read-only client (no wallet) for public browsing. Uses
 * chains.studionet directly from the installed SDK, not a hand-rolled
 * chain object — so any future genlayer-js patch to StudioNet's own
 * definition is picked up automatically.
 */
export function createReadClient(): GenLayerClient<typeof chains.studionet> {
	return createClient({ chain: chains.studionet }) as GenLayerClient<typeof chains.studionet>;
}

/**
 * Creates a wallet-aware client from an injected EIP-1193 provider. Never
 * requests or stores a private key — the provider itself performs signing.
 */
export function createWalletClient(provider: EthereumProvider): GenLayerClient<typeof chains.studionet> {
	return createClient({ chain: chains.studionet, provider }) as GenLayerClient<typeof chains.studionet>;
}

/** Reads the connected chain id directly from the injected provider (EIP-1193 eth_chainId), independent of what the client was constructed with. */
export async function getProviderChainId(provider: EthereumProvider): Promise<number> {
	const hex = (await provider.request({ method: 'eth_chainId' })) as string;
	return Number.parseInt(hex, 16);
}

export function isOnStudioNet(chainId: number): boolean {
	return chainId === STUDIONET.chainId;
}

/** Thrown by adapter functions when no contract address is configured — never silently substituted. */
export function requireContractAddress(address: string): asserts address is `0x${string}` {
	if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
		throw new FairModError('CONTRACT_NOT_CONFIGURED', 'No valid FairMod contract address is configured for this environment.');
	}
}
