import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '../adapter/WalletProvider';
import { getConfiguredContractAddress } from '../config/network';
import { createCommunity, listCommunities } from '../adapter/fairmodAdapter';
import { writeAndConfirm } from '../adapter/writeAndConfirm';
import { BOUNDS } from '../domain/constraints';
import { TxStatus } from '../components/TxStatus';
import type { TxObservation } from '../adapter/txLifecycle';

export function CreateCommunity() {
	const wallet = useWalletContext();
	const address = getConfiguredContractAddress();
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [metadata, setMetadata] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [observation, setObservation] = useState<TxObservation | undefined>(undefined);
	const [confirmed, setConfirmed] = useState<boolean | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);

	const nameError = name.length === 0 ? 'Name is required.' : name.length > BOUNDS.MAX_NAME_LEN ? `Name must be ${BOUNDS.MAX_NAME_LEN} characters or fewer.` : undefined;
	const metadataError = metadata.length > BOUNDS.MAX_METADATA_LEN ? `Description must be ${BOUNDS.MAX_METADATA_LEN} characters or fewer.` : undefined;

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (nameError || metadataError || submitting) return;
		if (wallet.status !== 'connected') {
			setError('Connect your wallet first.');
			return;
		}
		setSubmitting(true);
		setError(undefined);
		const beforeIds = await listCommunities(wallet.client, address);
		try {
			const result = await writeAndConfirm(
				wallet.client,
				() => createCommunity(wallet.client, address, name, metadata),
				() => listCommunities(wallet.client, address),
				(afterIds) => afterIds.length === beforeIds.length + 1,
			);
			setObservation(result.observation);
			setConfirmed(result.applicationConfirmed);
			if (result.applicationConfirmed) {
				const newId = result.rereadState?.find((id) => !beforeIds.includes(id));
				if (newId) navigate(`/communities/${newId}`);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<section className="fm-form-page">
			<h1>Create a community</h1>
			<form onSubmit={(e) => void onSubmit(e)}>
				<label>
					Name
					<input value={name} onChange={(e) => setName(e.target.value)} maxLength={BOUNDS.MAX_NAME_LEN} required aria-describedby="name-help" />
				</label>
				<p id="name-help" className="fm-field-help">{nameError ?? `${name.length}/${BOUNDS.MAX_NAME_LEN}`}</p>

				<label>
					Description (optional)
					<textarea value={metadata} onChange={(e) => setMetadata(e.target.value)} maxLength={BOUNDS.MAX_METADATA_LEN} />
				</label>
				<p className="fm-field-help">{metadataError ?? `${metadata.length}/${BOUNDS.MAX_METADATA_LEN}`}</p>

				<button type="submit" className="fm-button fm-button--primary" disabled={submitting || !!nameError || !!metadataError}>
					{submitting ? 'Submitting…' : 'Create community'}
				</button>
				{error && <p role="alert">{error}</p>}
			</form>
			<TxStatus observation={observation} applicationConfirmed={confirmed} />
		</section>
	);
}
