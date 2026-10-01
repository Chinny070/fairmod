/**
 * Single canonical FairMod/StudioNet configuration module. Every read/write
 * hook and every Explorer link MUST import from here — no second hardcoded
 * address, chain id, or RPC anywhere else in the frontend (closes
 * THREAT_MODEL.md row #20).
 *
 * The current canonical deployment address is supplied through
 * VITE_FAIRMOD_CONTRACT_ADDRESS (see docs/CANONICAL_DEPLOYMENT_VERIFICATION.md).
 * It deliberately has NO hardcoded fallback: an unset/malformed value is a
 * configuration error, not permission to silently target another contract.
 */

export const STUDIONET = {
	network: 'studionet' as const,
	chainId: 61999,
	rpcUrl: 'https://studio.genlayer.com/api',
	currencySymbol: 'GEN',
	explorerBase: 'https://explorer-studio.genlayer.com',
} as const;

function readEnv(key: string): string | undefined {
	// Vite exposes only VITE_-prefixed vars on import.meta.env; guarded for
	// the Vitest/node test environment where import.meta.env may be partial.
	const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
	return env?.[key];
}

/** '' means "not configured" — every consumer must treat that as CONTRACT_NOT_CONFIGURED, never as a fallback address. */
export function getConfiguredContractAddress(): string {
	return readEnv('VITE_FAIRMOD_CONTRACT_ADDRESS')?.trim() ?? '';
}

export function isValidAddress(value: string): value is `0x${string}` {
	return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function explorerTxUrl(hash: string): string {
	return `${STUDIONET.explorerBase}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
	return `${STUDIONET.explorerBase}/address/${address}`;
}

/** DEV_MODE gates fixture/mock data paths — see src/dev/fixtures.ts. Never true in a production build unless explicitly opted into by the deployer. */
export const DEV_MODE = readEnv('VITE_FAIRMOD_DEV_MODE') === 'true';
