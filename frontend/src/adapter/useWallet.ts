import { useCallback, useEffect, useState } from 'react';
import { createReadClient, createWalletClient, detectInjectedProvider, getProviderChainId, isOnStudioNet, type EthereumProvider } from './client';
import { STUDIONET } from '../config/network';
import { FairModError, normalizeError } from '../domain/errors';
import type { GenLayerClient } from 'genlayer-js/types';
import { chains } from 'genlayer-js';

export type WalletConnectionState = 'disconnected' | 'connecting' | 'connected' | 'wrong_network' | 'not_found';

export interface WalletState {
	status: WalletConnectionState;
	address: `0x${string}` | undefined;
	chainId: number | undefined;
	client: GenLayerClient<typeof chains.studionet>;
	connect: () => Promise<void>;
	disconnect: () => void;
	error: FairModError | undefined;
}

/**
 * Wallet integration hook (Stage 7 §5). `client` is ALWAYS a valid,
 * read-capable client — a public visitor gets a read-only client (no
 * provider) so browsing never requires a wallet; connecting swaps it for a
 * wallet-aware client. Never requests/stores a private key or seed phrase;
 * the injected provider performs all signing.
 */
export function useWallet(): WalletState {
	const [status, setStatus] = useState<WalletConnectionState>('disconnected');
	const [address, setAddress] = useState<`0x${string}` | undefined>(undefined);
	const [chainId, setChainId] = useState<number | undefined>(undefined);
	const [client, setClient] = useState<GenLayerClient<typeof chains.studionet>>(() => createReadClient());
	const [error, setError] = useState<FairModError | undefined>(undefined);
	const [provider, setProvider] = useState<EthereumProvider | undefined>(undefined);

	const refreshChainId = useCallback(async (p: EthereumProvider) => {
		const id = await getProviderChainId(p);
		setChainId(id);
		setStatus(isOnStudioNet(id) ? 'connected' : 'wrong_network');
	}, []);

	const connect = useCallback(async () => {
		setError(undefined);
		const injected = detectInjectedProvider();
		if (!injected) {
			setStatus('not_found');
			setError(new FairModError('WALLET_NOT_FOUND', 'No injected wallet (e.g. MetaMask) was detected in this browser.'));
			return;
		}
		setStatus('connecting');
		try {
			const accounts = (await injected.request({ method: 'eth_requestAccounts' })) as string[];
			if (!accounts || accounts.length === 0) {
				throw new FairModError('WALLET_REJECTED', 'No account was authorized.');
			}
			const account = accounts[0] as `0x${string}`;
			setAddress(account);
			setProvider(injected);
			setClient(createWalletClient(injected, account));
			await refreshChainId(injected);
		} catch (err) {
			setStatus('disconnected');
			setError(normalizeError(err));
		}
	}, [refreshChainId]);

	const disconnect = useCallback(() => {
		setStatus('disconnected');
		setAddress(undefined);
		setChainId(undefined);
		setProvider(undefined);
		setClient(createReadClient());
	}, []);

	useEffect(() => {
		if (!provider?.on) return;
		const onAccountsChanged = (...args: unknown[]) => {
			const accounts = args[0] as string[];
			if (!accounts || accounts.length === 0) {
				disconnect();
			} else {
				const account = accounts[0] as `0x${string}`;
				setAddress(account);
				setClient(createWalletClient(provider, account));
			}
		};
		const onChainChanged = () => {
			void refreshChainId(provider);
		};
		provider.on('accountsChanged', onAccountsChanged);
		provider.on('chainChanged', onChainChanged);
		return () => {
			provider.removeListener?.('accountsChanged', onAccountsChanged);
			provider.removeListener?.('chainChanged', onChainChanged);
		};
	}, [provider, disconnect, refreshChainId]);

	return { status, address, chainId, client, connect, disconnect, error };
}

/**
 * The single gate every write-capable UI control must consult (Stage 7.1
 * Gap 6: "no write becomes available under an invalid network/account
 * state"). True only when a wallet is connected AND on StudioNet.
 */
export function canWrite(wallet: Pick<WalletState, 'status' | 'chainId'>): boolean {
	return wallet.status === 'connected' && wallet.chainId === STUDIONET.chainId;
}

export function describeNetworkMismatch(chainId: number | undefined): string | undefined {
	if (chainId === undefined) return undefined;
	if (chainId === STUDIONET.chainId) return undefined;
	return `Your wallet is connected to chain ${chainId}, not StudioNet (chain ${STUDIONET.chainId}). Switch networks before submitting a transaction.`;
}
