
import React, { useEffect, useState, useCallback } from 'react';
import { Menu, Loader, Segment, Label } from 'semantic-ui-react';

// Browsable list of open markets for the active platform. Selecting a market
// notifies the parent via onSelect so the order book / ticket can load.
const MarketList = ({ client, platform, selectedMarketId, onSelect }) => {

    const [ markets, setMarkets ] = useState([]);
    const [ loading, setLoading ] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await client.listMarkets(platform);
        if (res.status === 'OK') {
            setMarkets(res.markets);
            // Auto-select the first market when none is selected yet.
            if (!selectedMarketId && res.markets.length > 0) {
                onSelect(res.markets[0]);
            }
        }
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ client, platform ]);

    useEffect(() => {
        load();
    }, [ load ]);

    if (loading) {
        return (
            <Segment basic><Loader active inline="centered" /></Segment>
        );
    }

    return (
        <Menu vertical fluid>
            { markets.map((market) => (
                <Menu.Item
                    key={ market.id }
                    active={ market.id === selectedMarketId }
                    onClick={ () => onSelect(market) }
                >
                    <Label color="blue" horizontal size="tiny">
                        { market.marketName }
                    </Label>
                    <div className="exchange-market-event">
                        { market.eventName }
                    </div>
                </Menu.Item>
            )) }
        </Menu>
    );

};

export default MarketList;
