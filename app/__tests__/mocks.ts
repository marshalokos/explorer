import {
    AddressLookupTableAccount,
    Message,
    MessageArgs,
    MessageCompiledInstruction,
    MessageV0,
    MessageV0Args,
    PublicKey,
    VersionedMessage,
} from '@solana/web3.js';
import { vi } from 'vitest';

// stub a test to not allow passing without tests
test('stub', () => expect(true).toBeTruthy());

vi.mock('next/navigation', () => {
    const actual = vi.importActual('next/navigation');
    const cluster = 'mainnet-beta';
    const customUrl = undefined;

    return {
        ...actual,
        usePathname: vi.fn(),
        useRouter: vi.fn(() => ({
            push: vi.fn(),
        })),
        useSearchParams: vi.fn(() => ({
            get: (param: string) => {
                if (param === 'cluster') return cluster;
                return null;
            },
            has: (param: string) => {
                if (param === 'customUrl' && customUrl) return true;
                return false;
            },
            toString: () => {
                let clusterString;
                if (cluster !== 'mainnet-beta') clusterString = `cluster=${cluster}`;
                if (customUrl) {
                    return `customUrl=${customUrl}${clusterString ? `&${clusterString}` : ''}`;
                }
                return clusterString ?? '';
            },
        })),
    };
});

export function deserializeMessage(message: string): VersionedMessage {
    const m = JSON.parse(message) as MessageArgs;
    const vm = new Message(m);

    return vm;
}

export function deserializeMessageV0(message: string): VersionedMessage {
    const m = JSON.parse(message);
    const messageArgs: MessageV0Args = {
        addressTableLookups:
            m.addressTableLookups?.map(
                (atl: { accountKey: string; writableIndexes: number[]; readonlyIndexes: number[] }) => {
                    return {
                        accountKey: new PublicKey(atl.accountKey),
                        readonlyIndexes: atl.readonlyIndexes,
                        writableIndexes: atl.writableIndexes,
                    };
                }
            ) ?? [],
        compiledInstructions: m.compiledInstructions.map(
            (ci: {
                programIdIndex: number;
                accountKeyIndexes: number[];
                data: { [key: string]: number } | { type: 'Buffer'; data: number[] };
            }) => {
                let data: Uint8Array;
                if ('type' in ci.data) {
                    data = Uint8Array.from(ci.data.data as number[]);
                } else {
                    data = new Uint8Array([...Object.values(ci.data)]);
                }

                return {
                    accountKeyIndexes: ci.accountKeyIndexes,
                    data: data,
                    programIdIndex: ci.programIdIndex,
                };
            }
        ),
        header: m.header,
        recentBlockhash: m.recentBlockhash,
        staticAccountKeys: m.staticAccountKeys.map((sak: string) => new PublicKey(sak)),
    };
    const vm = new MessageV0(messageArgs);

    return vm;
}

export function deserializeInstruction(instruction: string): MessageCompiledInstruction {
    const data = JSON.parse(instruction);
    data.data = Uint8Array.from(data.data.data);

    return data;
}

export async function sleep(ms?: number): Promise<void> {
    const FALLBACK_TIMEOUT_MS = 2000;
    const timeoutMs =
        ms || (process.env.TEST_SERIAL_TIMEOUT ? Number(process.env.TEST_SERIAL_TIMEOUT.trim()) : FALLBACK_TIMEOUT_MS);
    return await new Promise(resolve => setTimeout(resolve, timeoutMs));
}

/**
 * Creates a mock AddressLookupTableAccount for use in tests.
 *
 * The lookup table for EDDSpjZHrsFKYTMJDcBqXAjkLcu9EKdvrQR4XnqsXErH uses
 * readonlyIndexes [89, 123, 69, 80, 90, 94]. Index 69 is the Token Program.
 * All other entries are filled with the System Program as placeholders.
 */
export function createMockAddressLookupTableAccount(key: PublicKey): AddressLookupTableAccount {
    const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111');

    const addresses = Array.from({ length: 124 }, (_, i) => (i === 69 ? TOKEN_PROGRAM : SYSTEM_PROGRAM));

    return new AddressLookupTableAccount({
        key,
        state: {
            addresses,
            authority: undefined,
            deactivationSlot: BigInt('18446744073709551615'),
            lastExtendedSlot: 0,
            lastExtendedSlotStartIndex: 0,
        },
    });
}
