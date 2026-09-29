import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { VerdictBadge } from '../components/VerdictBadge';
import { getCase, getCommunity } from '../adapter/fairmodAdapter';
import { previewEvidenceUrl } from '../domain/constraints';

/**
 * Security regression suite (Stage 7.1). No `dangerouslySetInnerHTML` is
 * used anywhere in this codebase for untrusted protocol content — grep
 * `src/` for it to confirm; React's default JSX text/attribute rendering
 * already escapes HTML, which is what these tests exercise and pin down as
 * a regression guard, not a new mitigation.
 */

const ADDRESS = '0x1234567890123456789012345678901234567890';

function mockClient() {
	return { readContract: vi.fn(), writeContract: vi.fn() } as unknown as Parameters<typeof getCase>[0] & {
		readContract: ReturnType<typeof vi.fn>;
		writeContract: ReturnType<typeof vi.fn>;
	};
}

const DANGEROUS_TOKEN = 'dangerouslySetInnerHTML';

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) walk(full, out);
		else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
	}
	return out;
}

describe('security — no dangerouslySetInnerHTML anywhere in the source tree', () => {
	it('a real filesystem scan of every .ts/.tsx file under src/ finds zero uses of dangerouslySetInnerHTML outside this test file itself', () => {
		const srcDir = join(__dirname, '..');
		const offenders: string[] = [];
		for (const file of walk(srcDir)) {
			if (file.endsWith(join('test', 'security.test.tsx'))) continue; // this file's own description text
			const content = readFileSync(file, 'utf-8');
			if (content.includes(DANGEROUS_TOKEN)) offenders.push(file);
		}
		expect(offenders).toEqual([]);
	});
});

describe('security — untrusted protocol content renders as plain text, never executes', () => {
	it('a malicious HTML/script string in a moderation explanation renders as inert text', () => {
		const malicious = '<img src=x onerror="window.__xss=true">';
		const { container } = render(<div>{malicious}</div>);
		expect(container.querySelector('img')).toBeNull();
		expect(container.textContent).toContain('<img src=x onerror="window.__xss=true">');
		expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();
	});

	it('a script tag in reported content never becomes a live script element', () => {
		const malicious = '<script>window.__xss2 = true</script>';
		render(<p>{malicious}</p>);
		expect((window as unknown as { __xss2?: boolean }).__xss2).toBeUndefined();
	});
});

describe('security — evidence URL validation rejects dangerous schemes', () => {
	it('rejects a javascript: URL', () => {
		expect(previewEvidenceUrl('javascript:alert(document.cookie)').ok).toBe(false);
	});
	it('rejects a data: URL', () => {
		expect(previewEvidenceUrl('data:text/html,<script>alert(1)</script>').ok).toBe(false);
	});
	it('rejects a malformed URL with no host', () => {
		expect(previewEvidenceUrl('https://').ok).toBe(false);
	});
	it('handles an extremely long URL without throwing, and rejects it as over-bounds', () => {
		const long = 'https://example.com/' + 'a'.repeat(5000);
		expect(() => previewEvidenceUrl(long)).not.toThrow();
		expect(previewEvidenceUrl(long).ok).toBe(false);
	});
});

describe('security — malformed/duplicate identifiers are rejected or scoped, never confused', () => {
	it('a malformed address passed to grant_role-adjacent lookups does not crash the adapter (contract will revert; adapter must not throw a different, misleading error class)', async () => {
		const client = mockClient();
		client.readContract.mockRejectedValue(new Error('community does not exist'));
		await expect(getCommunity(client, ADDRESS, '<script>x</script>')).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
		// The malformed/hostile string was passed through as an opaque arg,
		// never interpreted or concatenated into a query/URL — confirmed by
		// asserting the exact call shape.
		expect(client.readContract).toHaveBeenCalledWith({ address: ADDRESS, functionName: 'get_community', args: ['<script>x</script>'] });
	});

	it('two different case IDs never resolve to the same adapter call target (no cross-case route confusion at the adapter boundary)', async () => {
		const client = mockClient();
		client.readContract.mockResolvedValue({});
		await getCase(client, ADDRESS, 'c0#0');
		await getCase(client, ADDRESS, 'c1#0');

		expect(client.readContract).toHaveBeenNthCalledWith(1, { address: ADDRESS, functionName: 'get_case', args: ['c0#0'] });
		expect(client.readContract).toHaveBeenNthCalledWith(2, { address: ADDRESS, functionName: 'get_case', args: ['c1#0'] });
	});
});

describe('security — status information is never color-only', () => {
	it('every verdict badge exposes a non-empty text label in addition to color', () => {
		for (const v of ['ALLOWED', 'FLAGGED', 'NEEDS_REVIEW', 'UNDETERMINED'] as const) {
			const { getByRole, unmount } = render(<VerdictBadge value={v} />);
			expect(getByRole('status').textContent?.trim().length).toBeGreaterThan(0);
			unmount();
		}
	});
});
