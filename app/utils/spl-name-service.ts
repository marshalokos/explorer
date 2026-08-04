/**
 * Inline implementation of Solana Name Service utilities.
 * Previously provided by @bonfida/spl-name-service (removed from npm).
 * Based on the original implementation at https://github.com/Bonfida/solana-name-service
 */
import { sha256 } from '@noble/hashes/sha256';
import { AccountInfo, Connection, GetProgramAccountsFilter, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/** The Solana Name Service program ID */
export const NAME_PROGRAM_ID = new PublicKey('namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX');

const HASH_PREFIX = 'SPL Name Service';

/** The reverse lookup class */
const REVERSE_LOOKUP_CLASS = new PublicKey('33m47vH6Eav6jr5Ry86XjhRft2jRBLDnDgPSHoquXi2Z');

const NAME_REGISTRY_HEADER_LEN = 96;

export interface NameRegistry {
    parentName: PublicKey;
    owner: PublicKey;
    class: PublicKey;
    data: Buffer | undefined;
}

function deserializeNameRegistry(data: Buffer): NameRegistry {
    const parentName = new PublicKey(data.slice(0, 32));
    const owner = new PublicKey(data.slice(32, 64));
    const nameClass = new PublicKey(data.slice(64, 96));
    const registryData = data.slice(NAME_REGISTRY_HEADER_LEN);
    return { parentName, owner, class: nameClass, data: registryData };
}

export async function getHashedName(name: string): Promise<Buffer> {
    const input = HASH_PREFIX + name;
    const hash = sha256(Buffer.from(input, 'utf8'));
    return Buffer.from(hash);
}

export async function getNameAccountKey(
    hashedName: Buffer,
    nameClass?: PublicKey,
    nameParent?: PublicKey
): Promise<PublicKey> {
    const seeds = [hashedName];
    seeds.push(nameClass ? nameClass.toBuffer() : Buffer.alloc(32));
    seeds.push(nameParent ? nameParent.toBuffer() : Buffer.alloc(32));
    const [nameAccountKey] = await PublicKey.findProgramAddress(seeds, NAME_PROGRAM_ID);
    return nameAccountKey;
}

export async function getNameOwner(
    connection: Connection,
    nameAccountKey: PublicKey
): Promise<{ registry: NameRegistry }> {
    const accountInfo = await connection.getAccountInfo(nameAccountKey);
    if (!accountInfo) {
        throw new Error('Unable to find the given account.');
    }
    const registry = deserializeNameRegistry(accountInfo.data);
    return { registry };
}

export async function performReverseLookup(connection: Connection, nameAccount: PublicKey): Promise<string> {
    const hashedReverseLookup = await getHashedName(nameAccount.toBase58());
    const reverseLookupAccount = await getNameAccountKey(hashedReverseLookup, REVERSE_LOOKUP_CLASS);

    const { registry } = await getNameOwner(connection, reverseLookupAccount);
    if (!registry.data) {
        throw new Error('Could not retrieve name data');
    }
    const nameLength = new BN(registry.data.slice(0, 4), 'le').toNumber();
    return registry.data.slice(4, 4 + nameLength).toString();
}

export async function getFilteredProgramAccounts(
    connection: Connection,
    programId: PublicKey,
    filters: GetProgramAccountsFilter[]
): Promise<{ publicKey: PublicKey; accountInfo: AccountInfo<Buffer> }[]> {
    const accounts = await connection.getProgramAccounts(programId, { filters });
    return accounts.map(({ pubkey, account }) => ({
        publicKey: pubkey,
        accountInfo: account,
    }));
}
