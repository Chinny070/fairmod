import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

/**
 * jsdom has no real canvas/rendering engine, so axe's `color-contrast`
 * check cannot reliably measure rendered pixel color (it logs a stubbed
 * "HTMLCanvasElement.prototype.getContext not implemented" error
 * internally rather than silently passing). Disabled explicitly here,
 * documented rather than left to fail unpredictably — real contrast
 * verification for the "Broadsheet" palette is a manual/visual review item
 * (see docs/DESIGN_SYSTEM.md), not something this jsdom-based suite can
 * check.
 */
const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } };
import { MemoryRouter } from 'react-router-dom';
import { VerdictBadge } from '../components/VerdictBadge';
import { TxStatus } from '../components/TxStatus';
import { Home } from '../pages/Home';
import { HowItWorks } from '../pages/HowItWorks';
import { NotFound } from '../pages/NotFound';

/**
 * Automated accessibility checks (Stage 7.1 Gap 3), using `axe-core` via
 * `vitest-axe` — a maintained, standard tool, not a bespoke checker.
 * Covers landmarks, heading structure, form labels, accessible names, and
 * color-contrast-independent status information across representative
 * surfaces. Pages that require a live wallet/contract client
 * (CommunityDetail, CaseDetail, CreateCommunity, admin/authoring tabs) are
 * exercised at the component level elsewhere and are not rendered here
 * without a full adapter mock harness — this file covers every route that
 * renders standalone.
 */

describe('accessibility — standalone pages', () => {
	it('Home has no detectable axe violations', async () => {
		const { container } = render(<MemoryRouter><Home /></MemoryRouter>);
		expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
	});

	it('HowItWorks has no detectable axe violations', async () => {
		const { container } = render(<MemoryRouter><HowItWorks /></MemoryRouter>);
		expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
	});

	it('NotFound has no detectable axe violations', async () => {
		const { container } = render(<MemoryRouter><NotFound /></MemoryRouter>);
		expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
	});
});

describe('accessibility — status components (never color-only)', () => {
	it('VerdictBadge renders a text label alongside its glyph for every verdict', () => {
		for (const v of ['ALLOWED', 'FLAGGED', 'NEEDS_REVIEW', 'UNDETERMINED', ''] as const) {
			const { container, unmount } = render(<VerdictBadge value={v} />);
			const badge = container.querySelector('.fm-badge');
			expect(badge?.textContent?.trim().length).toBeGreaterThan(0);
			expect(badge).toHaveAttribute('role', 'status');
			unmount();
		}
	});

	it('VerdictBadge has no detectable axe violations', async () => {
		const { container } = render(<VerdictBadge value="FLAGGED" />);
		expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
	});

	it('TxStatus surfaces a warning via role="alert" (not color alone) when execution failed', () => {
		const { getByRole } = render(
			<TxStatus
				observation={{
					hash: '0xabc0000000000000000000000000000000000000000000000000000000000',
					phase: 'execution_error',
					statusName: undefined,
					executionSucceeded: false,
					raw: {} as never,
				}}
			/>,
		);
		expect(getByRole('alert')).toHaveTextContent(/execution reported an error/i);
	});

	it('TxStatus has no detectable axe violations in its default (awaiting) state', async () => {
		const { container } = render(<TxStatus observation={undefined} />);
		expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
	});
});
