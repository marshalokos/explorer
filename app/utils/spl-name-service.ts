import { serialize } from 'borsh';
import { createHash } from 'crypto';

import type { GetProgramAccountsFilter } from '@solana/web3.js';
import { Connection, PublicKey } from '@solana/web3.js';

export const HASH_PREFIX = 'SPL Name Service';
export const NAME_PROGRAM_ID = new PublicKey('namesLPneVptA9KQ4KpC2kVBbQZ5Z5o9SgN4K3GQip');

class Numberu32 extends Uint8Array {
    constructor(value: number) {
        super(4);
        this[0] = value;
        this[1] = value >> 8;
        this[2] = value >> 16;
        this[3] = value >> 24;
    }
}

class ReverseTwitterRegistryState {
    parentName!: PublicKey;

    static schema = new Map([[ReverseTwitterRegistryState, { kind: 'struct', fields: [['parentName', [32]]] }]]);
}

export async function getHashedName(name: string): Promise<Buffer> {
    const input = HASH_PREFIX + name;
    const buffer = createHash('sha256').update(input, 'utf8').digest();
    return buffer;
}

export async function getNameAccountKey(
    hashedName: Buffer,
    nameClass?: PublicKey,
    nameParent?: PublicKey
): Promise<PublicKey> {
    const seeds = [hashedName];
    if (nameClass) {
        seeds.push(nameClass.toBuffer());
    } else {
        seeds.push(Buffer.alloc(32));
    }

    if (nameParent) {
        seeds.push(nameParent.toBuffer());
    } else {
        seeds.push(Buffer.alloc(32));
    }

    const [nameAccountKey] = await PublicKey.findProgramAddress(seeds, NAME_PROGRAM_ID);
    return nameAccountKey;
}

export async function getFilteredProgramAccounts(
    connection: Connection,
    programId: PublicKey,
    filters: GetProgramAccountsFilter[]
) {
    return connection.getProgramAccounts(programId, {
        filters,
    });
}

export async function getNameOwner(connection: Connection, nameAccountKey: PublicKey) {
    const nameAccount = await connection.getAccountInfo(nameAccountKey);
    if (!nameAccount) {
        throw new Error('Invalid name account provided');
    }

    const registry = {
        parentName: new PublicKey(nameAccount.data.slice(0, 32)),
        owner: new PublicKey(nameAccount.data.slice(32, 64)),
        class: new PublicKey(nameAccount.data.slice(64, 96)),
        data: nameAccount.data.slice(96),
    };

    return {
        registry,
        nftOwner: undefined,
    };
}

export async function performReverseLookup(connection: Connection, nameAccount: PublicKey): Promise<string> {
    const hashedReverseLookup = await getHashedName(nameAccount.toBase58());
    const reverseLookupAccount = await getNameAccountKey(hashedReverseLookup, undefined, NAME_PROGRAM_ID);
    const registry = await getNameOwner(connection, reverseLookupAccount);
    const nameLength = new Numberu32(registry.registry.data.length);
    const serializedNumber = serialize(new Map([[Numberu32, { kind: 'struct', fields: [['0', 'u8'], ['1', 'u8'], ['2', 'u8'], ['3', 'u8']] }]]), nameLength);
    const reverseTwitterRegistryStateBuff = registry.registry.data?.slice(serializedNumber.length);
    const reverseTwitterRegistryState = deserializeReverseTwitterRegistryState(reverseTwitterRegistryStateBuff);
    return reverseTwitterRegistryState.parentName.toBase58().slice(0, 32) ? registry.registry.data.toString().replace(/\0/g, '') : '';
}

function deserializeReverseTwitterRegistryState(data: Buffer | Uint8Array) {
    return {
        parentName: new PublicKey(data.slice(0, 32)),
    };
}
