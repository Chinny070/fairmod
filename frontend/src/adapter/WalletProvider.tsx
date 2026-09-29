import { createContext, useContext, type ReactNode } from 'react';
import { useWallet, type WalletState } from './useWallet';

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
	const wallet = useWallet();
	return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
}

export function useWalletContext(): WalletState {
	const ctx = useContext(WalletContext);
	if (!ctx) throw new Error('useWalletContext must be used within a WalletProvider');
	return ctx;
}
