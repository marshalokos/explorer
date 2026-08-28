import * as BufferLayout from '@solana/buffer-layout';

const publicKey = (property: string) => {
    return BufferLayout.blob(32, property);
};

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace NftokenTypes {
    export type Metadata = {
        name: string;
        description: string | null;

        image: string;
        traits: any;

        animation_url: string | null;
        external_url: string | null;
    };

    export type CollectionAccount = {
        address: string;
        authority: string;
        authority_can_update: boolean;

        metadata_url: string | null;
    };

    export type NftAccount = {
        address: string;
        holder: string;
        authority: string;
        authority_can_update: boolean;

        collection: string | null;
        delegate: string | null;

        metadata_url: string;
    };

    export type NftInfo = NftAccount & Partial<Metadata>;

    export const nftAccountLayout = BufferLayout.struct<{
        discriminator: Uint8Array;
        version: number;
        holder: Uint8Array;
        authority: Uint8Array;
        authority_can_update: number;
        collection: Uint8Array;
        delegate: Uint8Array;
        is_frozen: number;
        unused_1: number;
        unused_2: number;
        unused_3: number;
        metadata_url_length: number;
        metadata_url: string;
    }>([
        BufferLayout.blob(8, 'discriminator'),
        BufferLayout.u8('version'),
        publicKey('holder'),
        publicKey('authority'),
        BufferLayout.u8('authority_can_update'),
        publicKey('collection'),
        publicKey('delegate'),
        BufferLayout.u8('is_frozen'),
        BufferLayout.u8('unused_1'),
        BufferLayout.u8('unused_2'),
        BufferLayout.u8('unused_3'),
        BufferLayout.u32('metadata_url_length'),
        BufferLayout.utf8(400, 'metadata_url'),
    ]);

    export const collectionAccountLayout = BufferLayout.struct<{
        discriminator: Uint8Array;
        version: number;
        authority: Uint8Array;
        authority_can_update: number;
        unused_1: number;
        unused_2: number;
        unused_3: number;
        unused_4: number;
        metadata_url_length: number;
        metadata_url: string;
    }>([
        BufferLayout.blob(8, 'discriminator'),
        BufferLayout.u8('version'),
        publicKey('authority'),
        BufferLayout.u8('authority_can_update'),
        BufferLayout.u8('unused_1'),
        BufferLayout.u8('unused_2'),
        BufferLayout.u8('unused_3'),
        BufferLayout.u8('unused_4'),
        BufferLayout.u32('metadata_url_length'),
        BufferLayout.utf8(400, 'metadata_url'),
    ]);
}
