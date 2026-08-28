import assert from 'assert';
import { createHash } from 'crypto';

import BN from 'bn.js';

import type { AccountInfo, GetProgramAccountsFilter } from '@solana/web3.js';
import { Connection, PublicKey } from '@solana/web3.js';

export const HASH_PREFIX = 'SPL Name Service';
export const NAME_PROGRAM_ID = new PublicKey('namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX');
const REVERSE_LOOKUP_CLASS = new PublicKey('jCebN34bUfdeUYJT13J1yG16XWQpt5PDx6Mse9GUqhR');

export class Numberu32 extends BN {
    toBuffer(): Buffer {
        const a = super.toArray().reverse();
        const b = Buffer.from(a);
        if (b.length === 4) {
            return b;
        }
        assert(b.length < 4, 'Numberu32 too large');

        const zeroPad = Buffer.alloc(4);
        b.copy(zeroPad);
        return zeroPad;
    }
}

export async function getHashedName(name: string): Promise<Buffer> {
    return createHash('sha256')
        .update(HASH_PREFIX + name, 'utf8')
        .digest();
}

export async function getNameAccountKey(
    hashedName: Buffer,
    nameClass?: PublicKey,
    nameParent?: PublicKey
): Promise<PublicKey> {
    const seeds = [hashedName, nameClass?.toBuffer() ?? Buffer.alloc(32), nameParent?.toBuffer() ?? Buffer.alloc(32)];
    const [nameAccountKey] = await PublicKey.findProgramAddress(seeds, NAME_PROGRAM_ID);
    return nameAccountKey;
}

type NameRegistryState = {
    registry: {
        parentName: PublicKey;
        owner: PublicKey;
        class: PublicKey;
        data: Buffer;
    };
    nftOwner: undefined;
};

export async function getNameOwner(connection: Connection, nameAccountKey: PublicKey): Promise<NameRegistryState> {
    const nameAccount = await connection.getAccountInfo(nameAccountKey);
    if (!nameAccount) {
        throw new Error('Unable to find the given account.');
    }

    return {
        registry: {
            parentName: new PublicKey(nameAccount.data.slice(0, 32)),
            owner: new PublicKey(nameAccount.data.slice(32, 64)),
            class: new PublicKey(nameAccount.data.slice(64, 96)),
            data: Buffer.from(nameAccount.data.slice(96)),
        },
        nftOwner: undefined,
    };
}

export async function getFilteredProgramAccounts(
    connection: Connection,
    programId: PublicKey,
    filters: GetProgramAccountsFilter[]
): Promise<{ publicKey: PublicKey; accountInfo: AccountInfo<Buffer> }[]> {
    const resp = await connection.getProgramAccounts(programId, {
        commitment: connection.commitment,
        filters,
        encoding: 'base64',
    });

    return resp.map(({ pubkey, account: { data, executable, owner, lamports } }) => ({
        publicKey: pubkey,
        accountInfo: {
            data,
            executable,
            owner,
            lamports,
        },
    }));
}

export async function performReverseLookup(connection: Connection, nameAccount: PublicKey): Promise<string> {
    const hashedReverseLookup = await getHashedName(nameAccount.toBase58());
    const reverseLookupAccount = await getNameAccountKey(hashedReverseLookup, REVERSE_LOOKUP_CLASS);
    const registry = await getNameOwner(connection, reverseLookupAccount);
    const data = registry.registry.data;

    if (!data.length) {
        throw new Error('Could not retrieve name data');
    }

    const nameLength = new Numberu32(data.slice(0, 4)).toNumber();
    return data.slice(4, 4 + nameLength).toString();
}
