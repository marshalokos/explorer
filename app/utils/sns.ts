import { sha256 } from '@noble/hashes/sha256';
import { Connection, GetProgramAccountsFilter, PublicKey } from '@solana/web3.js';

export const NAME_PROGRAM_ID = new PublicKey('ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK');
const NAME_REGISTRY_HEADER_LEN = 168;
const HASH_PREFIX = 'ALT Name Service';

const encodeName = (name: string) => new TextEncoder().encode(HASH_PREFIX + name);

export async function getHashedName(name: string) {
    return Buffer.from(sha256(encodeName(name)));
}

export async function getNameAccountKey(hashedName: Buffer, nameClass?: PublicKey, nameParent?: PublicKey) {
    const seeds = [hashedName, nameClass ? nameClass.toBuffer() : Buffer.alloc(32), nameParent ? nameParent.toBuffer() : Buffer.alloc(32)];
    const [key] = await PublicKey.findProgramAddress(seeds, NAME_PROGRAM_ID);
    return key;
}

export async function getNameOwner(connection: Connection, nameAccountKey: PublicKey) {
    const accountInfo = await connection.getAccountInfo(nameAccountKey);
    if (!accountInfo) return null;

    return {
        registry: {
            owner: new PublicKey(accountInfo.data.subarray(32, 64)),
        },
    };
}

export async function getFilteredProgramAccounts(
    connection: Connection,
    programId: PublicKey,
    filters: GetProgramAccountsFilter[]
) {
    return connection.getProgramAccounts(programId, { filters });
}

export async function performReverseLookup(connection: Connection, nameAccount: PublicKey) {
    const reverseLookupHashedName = await getHashedName(nameAccount.toBase58());
    const reverseLookupAccount = await getNameAccountKey(reverseLookupHashedName, undefined, undefined);
    const accountInfo = await connection.getAccountInfo(reverseLookupAccount);
    if (!accountInfo || accountInfo.data.length < NAME_REGISTRY_HEADER_LEN + 4) {
        throw new Error('Reverse lookup account not found');
    }

    const data = accountInfo.data;
    return data.subarray(NAME_REGISTRY_HEADER_LEN).toString().replace(/\0.*$/s, '');
}
