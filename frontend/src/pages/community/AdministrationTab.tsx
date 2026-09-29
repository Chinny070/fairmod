import { useState } from 'react';
import { useWalletContext } from '../../adapter/WalletProvider';
import { canWrite } from '../../adapter/useWallet';
import { grantRole, revokeRole, getRole } from '../../adapter/fairmodAdapter';
import { writeAndConfirm } from '../../adapter/writeAndConfirm';
import { TxStatus } from '../../components/TxStatus';
import type { TxObservation } from '../../adapter/txLifecycle';
import type { Community } from '../../domain/types';

/**
 * Community administration — grant_role/revoke_role (Stage 7.1 Gap 1).
 * Contract-enforced authority is authoritative; this UI is convenience only
 * (Stage 7 §20) — it disables nothing it cannot re-verify, and every write
 * re-reads `get_role` afterward before claiming success.
 */
export function AdministrationTab({ communityId, address, community, isOwner }: { communityId: string; address: string; community: Community; isOwner: boolean }) {
	if (!isOwner) {
		return (
			<section className="fm-admin">
				<h2>Administration</h2>
				<p className="fm-empty">
					Only this community&apos;s owner (<code>{community.owner}</code>) may grant or revoke roles here. Contract
					authorization is authoritative regardless of what this page shows.
				</p>
			</section>
		);
	}
	return (
		<section className="fm-admin">
			<h2>Administration</h2>
			<p className="fm-field-help">
				Only ADMIN and MODERATOR may be granted — OWNER is implicit and cannot be granted or revoked (contracts/fairmod.py: <code>ROLE_OWNER</code> is never in <code>VALID_ROLES</code>).
			</p>
			<RoleForm communityId={communityId} address={address} />
		</section>
	);
}

function RoleForm({ communityId, address }: { communityId: string; address: string }) {
	const wallet = useWalletContext();
	const [target, setTarget] = useState('');
	const [role, setRole] = useState<'ADMIN' | 'MODERATOR'>('MODERATOR');
	const [confirming, setConfirming] = useState<'grant' | 'revoke' | undefined>(undefined);
	const [busy, setBusy] = useState(false);
	const [observation, setObservation] = useState<TxObservation | undefined>(undefined);
	const [confirmed, setConfirmed] = useState<boolean | undefined>(undefined);
	const [currentRole, setCurrentRole] = useState<string | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);

	const targetLooksValid = /^0x[0-9a-fA-F]{40}$/.test(target);

	async function lookupCurrentRole() {
		if (!targetLooksValid) return;
		try {
			setCurrentRole(await getRole(wallet.client, address, communityId, target));
		} catch {
			setCurrentRole(undefined);
		}
	}

	async function doGrant() {
		setBusy(true);
		setError(undefined);
		try {
			const result = await writeAndConfirm(
				wallet.client,
				() => grantRole(wallet.client, address, communityId, target, role),
				() => getRole(wallet.client, address, communityId, target),
				(r) => r === role,
			);
			setObservation(result.observation);
			setConfirmed(result.applicationConfirmed);
			setCurrentRole(result.rereadState);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
			setConfirming(undefined);
		}
	}

	async function doRevoke() {
		setBusy(true);
		setError(undefined);
		try {
			const result = await writeAndConfirm(
				wallet.client,
				() => revokeRole(wallet.client, address, communityId, target),
				() => getRole(wallet.client, address, communityId, target),
				(r) => r === 'NONE',
			);
			setObservation(result.observation);
			setConfirmed(result.applicationConfirmed);
			setCurrentRole(result.rereadState);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
			setConfirming(undefined);
		}
	}

	return (
		<div className="fm-role-form">
			<label>
				Target account (0x…)
				<input value={target} onChange={(e) => setTarget(e.target.value)} onBlur={() => void lookupCurrentRole()} placeholder="0x0000000000000000000000000000000000000000" aria-describedby="target-role-help" />
			</label>
			<p id="target-role-help" className="fm-field-help">
				{targetLooksValid ? (currentRole ? <>Current role: <strong>{currentRole}</strong></> : 'Checking current role…') : 'Enter a 40-character hex address.'}
			</p>

			<fieldset>
				<legend>Role to grant</legend>
				<label>
					<input type="radio" name="role" checked={role === 'ADMIN'} onChange={() => setRole('ADMIN')} /> ADMIN
				</label>
				<label>
					<input type="radio" name="role" checked={role === 'MODERATOR'} onChange={() => setRole('MODERATOR')} /> MODERATOR
				</label>
			</fieldset>

			<div className="fm-role-form__actions">
				<button type="button" disabled={!targetLooksValid || busy || !canWrite(wallet)} onClick={() => setConfirming('grant')}>
					Grant {role}
				</button>
				<button type="button" disabled={!targetLooksValid || busy || !canWrite(wallet)} onClick={() => setConfirming('revoke')}>
					Revoke role
				</button>
			</div>
			{!canWrite(wallet) && <p className="fm-field-help">Connect a wallet on StudioNet to change roles.</p>}

			{confirming && (
				<div role="dialog" aria-modal="true" aria-label="Confirm role change" className="fm-confirm-dialog">
					<p>
						{confirming === 'grant' ? (
							<>Grant <strong>{role}</strong> to <code>{target}</code>? This lets them freeze cases, file challenges, and moderate on this community&apos;s behalf.</>
						) : (
							<>Revoke <strong>{currentRole ?? 'this account’s'}</strong> role from <code>{target}</code>? They will immediately lose any moderator/admin authority in this community.</>
						)}
					</p>
					<button type="button" onClick={() => void (confirming === 'grant' ? doGrant() : doRevoke())} disabled={busy}>
						{busy ? 'Submitting…' : 'Confirm'}
					</button>
					<button type="button" onClick={() => setConfirming(undefined)} disabled={busy}>
						Cancel
					</button>
				</div>
			)}

			{error && <p role="alert">{error}</p>}
			<TxStatus observation={observation} applicationConfirmed={confirmed} />
		</div>
	);
}
