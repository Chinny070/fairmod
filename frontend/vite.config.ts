import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	build: {
		// The genlayer-vendor chunk (genlayer-js + its viem dependency, the
		// wallet/RPC/ABI-encoding SDK) is ~535kB minified and cannot be made
		// smaller without genlayer-js itself shipping a lighter build — see
		// the manualChunks comment below and docs/FRONTEND_HOSTED_VERIFICATION_MATRIX.md
		// for the measured before/after and why further splitting isn't sound.
		// Raised, not silenced blindly: this is a deliberate, documented
		// acceptance of one specific known chunk, not a blanket suppression.
		chunkSizeWarningLimit: 600,
		rollupOptions: {
			output: {
				// GenLayer/viem (the wallet+RPC SDK) is required on first paint
				// for this app's public, wallet-free read-only browsing (Stage 7
				// §10) — it cannot be route-split without breaking that
				// requirement. Splitting it into its own vendor chunk doesn't
				// reduce first-load bytes, but it does mean app-code deploys
				// (which change far more often than the pinned SDK version)
				// don't invalidate this chunk's browser cache. See Stage 7.1's
				// bundle investigation in docs/FRONTEND_HOSTED_VERIFICATION_MATRIX.md.
				manualChunks: {
					'genlayer-vendor': ['genlayer-js'],
				},
			},
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
	},
});
