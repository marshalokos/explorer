import { Connection, PublicKey } from '@solana/web3.js';
import { vi } from 'vitest';

import { getHashedName, getNameAccountKey, getNameOwner, performReverseLookup } from '../sns';

describe('sns utils', () => {
    it('derives deterministic name accounts', async () => {
        const hashedName = await getHashedName('example');
        const first = await getNameAccountKey(hashedName);
        const second = await getNameAccountKey(hashedName);
        expect(first.toBase58()).toBe(second.toBase58());
    });

    it('returns the owner from name registry account data', async () => {
        const owner = new PublicKey('11111111111111111111111111111112');
        const data = Buffer.alloc(96);
        owner.toBuffer().copy(data, 32);
        const getAccountInfo = vi.fn().mockResolvedValue({ data });
        const connection = { getAccountInfo } as unknown as Connection;

        await expect(getNameOwner(connection, owner)).resolves.toEqual({
            registry: { owner },
        });
    });

    it('decodes reverse lookup data after the registry header', async () => {
        const nameAccount = new PublicKey('11111111111111111111111111111113');
        const label = 'example';
        const data = Buffer.alloc(168 + label.length + 1);
        data.write(label, 168, 'utf8');
        const getAccountInfo = vi.fn().mockResolvedValue({ data });
        const connection = { getAccountInfo } as unknown as Connection;

        await expect(performReverseLookup(connection, nameAccount)).resolves.toBe(label);
        expect(getAccountInfo).toHaveBeenCalledTimes(1);
    });
});
