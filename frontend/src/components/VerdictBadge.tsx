import type { Verdict, FinalVerdict } from '../domain/types';

const LABEL: Record<string, string> = {
	ALLOWED: 'Allowed',
	FLAGGED: 'Flagged',
	NEEDS_REVIEW: 'Needs review',
	UNDETERMINED: 'Undetermined',
	'': 'Pending',
};

/** Never relies on color alone — always renders an icon glyph + text label (Stage 7 §24/§26). */
export function VerdictBadge({ value }: { value: Verdict | FinalVerdict }) {
	const key = value || '';
	const glyph = key === 'ALLOWED' ? '✓' : key === 'FLAGGED' ? '✕' : key === 'UNDETERMINED' ? '—' : '●';
	return (
		<span className={`fm-badge fm-badge--${key.toLowerCase() || 'pending'}`} role="status">
			<span aria-hidden="true" className="fm-badge__glyph">{glyph}</span>
			{LABEL[key] ?? key}
		</span>
	);
}
