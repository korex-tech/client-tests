
import React, { useMemo, useState } from 'react';
import { Menu, Grid, Header, Label, Container } from 'semantic-ui-react';

import ExchangeClient from '../../api/ExchangeClient';
import AccountBar from './AccountBar';
import MarketList from './MarketList';
import MarketView from './MarketView';
import OpenOrders from './OpenOrders';

import './Exchange.css';

// Polymarket is listed first: it's the venue implemented in the backend's
// Phase 0 read path (Betfair follows in a later phase).
const PLATFORMS = [
    { key: 'polymarket', label: 'Polymarket' },
    { key: 'betfair', label: 'Betfair' },
];

// Top-level trading screen. Lets the user switch between platforms, browse
// markets, view the order book and place / manage bets. A single bumped
// `refreshKey` re-pulls balances and open orders after any order change.
const ExchangeDashboard = (props) => {

    // One client instance for the lifetime of the dashboard.
    const client = useMemo(() => props.client || ExchangeClient(), [ props.client ]);

    const [ platform, setPlatform ] = useState('polymarket');
    const [ selectedMarketId, setSelectedMarketId ] = useState(undefined);
    const [ refreshKey, setRefreshKey ] = useState(0);

    const onSelectPlatform = (key) => {
        setPlatform(key);
        setSelectedMarketId(undefined);
    };

    const onSelectMarket = (market) => {
        setSelectedMarketId(market.id);
    };

    // Called after an order is placed or cancelled.
    const bumpRefresh = () => setRefreshKey((k) => k + 1);

    return (
        <Container className="exchange-dashboard">
            <Header as="h2">
                Exchange Trading
                { client.isMock() && (
                    <Label color="orange" size="tiny" style={{ marginLeft: '0.75em' }}>
                        MOCK DATA
                    </Label>
                ) }
                <Header.Subheader>
                    Place and manage bets across Betfair and Polymarket
                </Header.Subheader>
            </Header>

            <Menu pointing secondary>
                { PLATFORMS.map((p) => (
                    <Menu.Item
                        key={ p.key }
                        name={ p.label }
                        active={ platform === p.key }
                        onClick={ () => onSelectPlatform(p.key) }
                    />
                )) }
            </Menu>

            <AccountBar
                client={ client }
                platform={ platform }
                refreshKey={ refreshKey }
            />

            <Grid stackable>
                <Grid.Column width={ 5 }>
                    <MarketList
                        client={ client }
                        platform={ platform }
                        selectedMarketId={ selectedMarketId }
                        onSelect={ onSelectMarket }
                    />
                </Grid.Column>
                <Grid.Column width={ 11 }>
                    { selectedMarketId ? (
                        <MarketView
                            client={ client }
                            platform={ platform }
                            marketId={ selectedMarketId }
                            onOrderPlaced={ bumpRefresh }
                        />
                    ) : (
                        <p className="exchange-empty">Select a market to start trading.</p>
                    ) }
                    <OpenOrders
                        client={ client }
                        platform={ platform }
                        refreshKey={ refreshKey }
                        onChanged={ bumpRefresh }
                    />
                </Grid.Column>
            </Grid>
        </Container>
    );

};

export default ExchangeDashboard;
