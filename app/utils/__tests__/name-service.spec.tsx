import { renderHook, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserDomains } from '../name-service';

vi.mock('@providers/cluster', () => ({
    useCluster: () => ({
        cluster: 'mainnet-beta',
        url: 'http://localhost:8899',
    }),
}));

vi.mock('@utils/cluster', () => ({
    Cluster: {
        MainnetBeta: 'mainnet-beta',
        Custom: 'custom',
    },
}));

vi.mock('@solana/web3.js', async importOriginal => {
    const actual = await importOriginal<typeof import('@solana/web3.js')>();

    class MockConnection {
        constructor(_url: string, _commitment?: string) {}
    }

    return {
        ...actual,
        Connection: MockConnection,
    };
});

vi.mock('@onsol/tldparser', async importOriginal => {
    const actual = await importOriginal<typeof import('@onsol/tldparser')>();

    return {
        ...actual,
        findOwnedNameAccountsForUser: vi.fn(),
        findTldHouse: vi.fn(),
        performReverseLookupBatched: vi.fn(),
    };
});

import { PublicKey } from '@solana/web3.js';
import { findOwnedNameAccountsForUser, findTldHouse, performReverseLookupBatched } from '@onsol/tldparser';

describe('useUserDomains', () => {
    const account = new PublicKey('11111111111111111111111111111111');
    const owner = '8fjkR9V8d8wUuW1P8D9u2pQ9vX8J6x6U2gkS6dY8rXYx';

    beforeEach(() => {
        vi.clearAllMocks();
        (findOwnedNameAccountsForUser as Mock).mockResolvedValue([account]);
        (findTldHouse as Mock).mockReturnValue([new PublicKey('58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx')]);
    });

    it('returns resolved .sol domains', async () => {
        (performReverseLookupBatched as Mock).mockResolvedValue(['alice']);

        const { result } = renderHook(() => useUserDomains(owner));

        await waitFor(() => expect(result.current[1]).toBe(false));

        expect(result.current[0]).toEqual([{ address: account, name: 'alice.sol' }]);
    });

    it('skips accounts with missing reverse lookup results', async () => {
        (performReverseLookupBatched as Mock).mockResolvedValue([undefined]);

        const { result } = renderHook(() => useUserDomains(owner));

        await waitFor(() => expect(result.current[1]).toBe(false));

        expect(result.current[0]).toEqual([]);
    });
});
