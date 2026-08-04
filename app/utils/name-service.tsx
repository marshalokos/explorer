'use client';

import { findOwnedNameAccountsForUser, findTldHouse, performReverseLookupBatched } from '@onsol/tldparser';
import { useCluster } from '@providers/cluster';
import { Connection, PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { useEffect, useState } from 'react';

import { DomainInfo, SOL_TLD_AUTHORITY } from './domain-info';

async function getUserDomainAddresses(connection: Connection, userAddress: string): Promise<PublicKey[]> {
    return findOwnedNameAccountsForUser(connection, new PublicKey(userAddress), SOL_TLD_AUTHORITY);
}

async function performReverseLookup(connection: Connection, address: PublicKey): Promise<string | undefined> {
    const [solTldHouse] = findTldHouse('sol');
    const [domainName] = await performReverseLookupBatched(connection, [address], solTldHouse);
    return domainName;
}

export const useUserDomains = (userAddress: string): [DomainInfo[] | null, boolean] => {
    const { url, cluster } = useCluster();
    const [result, setResult] = useState<DomainInfo[] | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const resolve = async () => {
            // Allow only mainnet and custom
            if (![Cluster.MainnetBeta, Cluster.Custom].includes(cluster)) return;
            const connection = new Connection(url, 'confirmed');
            try {
                setLoading(true);
                const userDomainAddresses = await getUserDomainAddresses(connection, userAddress);
                const userDomains = await Promise.all(
                    userDomainAddresses.map(async address => {
                        const domainName = await performReverseLookup(connection, address);
                        if (!domainName) return null;
                        return {
                            address,
                            name: `${domainName}.sol`,
                        };
                    })
                );
                const resolvedDomains = userDomains.filter((domain): domain is DomainInfo => domain !== null);
                resolvedDomains.sort((a, b) => a.name.localeCompare(b.name));
                setResult(resolvedDomains);
            } catch (err) {
                console.log(`Error fetching user domains ${err}`);
            } finally {
                setLoading(false);
            }
        };
        resolve();
    }, [userAddress, url]); // eslint-disable-line react-hooks/exhaustive-deps

    return [result, loading];
};
