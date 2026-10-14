import { PublicKey } from '@solana/web3.js';

import { getHashedName, getNameAccountKey, HASH_PREFIX, NAME_PROGRAM_ID, Numberu32 } from '@utils/spl-name-service';

describe('spl-name-service utilities', () => {
    it('hashes names with the SPL name service prefix', async () => {
        const hash = await getHashedName('bonfida');
        expect(hash).toHaveLength(32);

        const crypto = await import('crypto');
        const expected = crypto.createHash('sha256').update(`${HASH_PREFIX}bonfida`, 'utf8').digest('hex');
        expect(hash.toString('hex')).toBe(expected);
    });

    it('derives the same PDA as web3 directly', async () => {
        const hashedName = await getHashedName('example');
        const nameClass = new PublicKey('58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx');
        const nameParent = new PublicKey('11111111111111111111111111111111');

        const derived = await getNameAccountKey(hashedName, nameClass, nameParent);
        const [expected] = await PublicKey.findProgramAddress(
            [hashedName, nameClass.toBuffer(), nameParent.toBuffer()],
            NAME_PROGRAM_ID
        );

        expect(derived.toBase58()).toBe(expected.toBase58());
    });

    it('serializes Numberu32 as little-endian', () => {
        expect(new Numberu32(0x12345678).toBuffer()).toEqual(Buffer.from([0x78, 0x56, 0x34, 0x12]));
    });
});
