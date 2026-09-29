import { useEffect, useState } from 'react';
import { normalizeError, type FairModError } from '../domain/errors';

export type AsyncState<T> =
	| { status: 'loading' }
	| { status: 'error'; error: FairModError }
	| { status: 'success'; data: T };

/** Shared loading/error/success data-fetch pattern for every read-only surface (Stage 7 §32). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> & { reload: () => void } {
	const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
	const [tick, setTick] = useState(0);

	useEffect(() => {
		let cancelled = false;
		setState({ status: 'loading' });
		fn()
			.then((data) => {
				if (!cancelled) setState({ status: 'success', data });
			})
			.catch((err) => {
				if (!cancelled) setState({ status: 'error', error: normalizeError(err) });
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...deps, tick]);

	return { ...state, reload: () => setTick((t) => t + 1) } as AsyncState<T> & { reload: () => void };
}
