
import React, { useEffect, useState, useCallback } from 'react';
import { Statistic, Segment, Loader } from 'semantic-ui-react';

import { formatMoney } from './format';

// Shows the available balance and current exposure for the active platform.
const AccountBar = ({ client, platform, refreshKey }) => {

    const [ balance, setBalance ] = useState(undefined);
    const [ loading, setLoading ] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await client.getBalance(platform);
        if (res.status === 'OK') {
            setBalance(res.balance);
        }
        setLoading(false);
    }, [ client, platform ]);

    useEffect(() => {
        load();
    }, [ load, refreshKey ]);

    if (loading || balance === undefined) {
        return (
            <Segment basic><Loader active inline size="small" /></Segment>
        );
    }

    return (
        <Segment>
            <Statistic.Group size="small" widths="two">
                <Statistic color="green">
                    <Statistic.Value>
                        { formatMoney(balance.available, balance.currency) }
                    </Statistic.Value>
                    <Statistic.Label>Available</Statistic.Label>
                </Statistic>
                <Statistic color={ balance.exposure > 0 ? 'red' : 'grey' }>
                    <Statistic.Value>
                        { formatMoney(balance.exposure, balance.currency) }
                    </Statistic.Value>
                    <Statistic.Label>Exposure</Statistic.Label>
                </Statistic>
            </Statistic.Group>
        </Segment>
    );

};

export default AccountBar;
