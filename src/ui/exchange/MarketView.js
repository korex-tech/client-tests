
import React, { useEffect, useState, useCallback } from 'react';
import { Segment, Table, Header, Loader, Button } from 'semantic-ui-react';

import OrderTicket from './OrderTicket';
import { formatPrice } from './format';

// Order book for the selected market plus the order entry ticket.
// Each runner row shows the best price available to BACK and to LAY; clicking
// a price loads it into the ticket.
const MarketView = ({ client, platform, marketId, onOrderPlaced }) => {

    const [ market, setMarket ] = useState(undefined);
    const [ loading, setLoading ] = useState(true);
    const [ selection, setSelection ] = useState(undefined);

    const load = useCallback(async () => {
        setLoading(true);
        setSelection(undefined);
        const res = await client.getMarket(platform, marketId);
        setMarket(res.status === 'OK' ? res.market : undefined);
        setLoading(false);
    }, [ client, platform, marketId ]);

    useEffect(() => {
        load();
    }, [ load ]);

    if (loading) {
        return <Segment basic><Loader active inline="centered" /></Segment>;
    }
    if (!market) {
        return <Segment>Market not found.</Segment>;
    }

    const pickPrice = (runner, side, level) => {
        setSelection({
            runnerId: runner.id,
            runnerName: runner.name,
            side,
            price: level.price,
        });
    };

    const priceCell = (runner, side, level, highlight) => (
        <Table.Cell
            key={ side + level.price }
            selectable
            textAlign="center"
            className={ 'exchange-price-cell exchange-' + side.toLowerCase() +
                (highlight ? ' exchange-best' : '') }
            onClick={ () => pickPrice(runner, side, level) }
        >
            <div className="exchange-price">
                { formatPrice(level.price, market.priceType) }
            </div>
            <div className="exchange-size">{ level.size }</div>
        </Table.Cell>
    );

    return (
        <div>
            <Header as="h3">
                { market.eventName }
                <Header.Subheader>{ market.marketName }</Header.Subheader>
            </Header>

            <Table celled unstackable textAlign="center">
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell textAlign="left">Selection</Table.HeaderCell>
                        <Table.HeaderCell className="exchange-back">Back</Table.HeaderCell>
                        <Table.HeaderCell className="exchange-back" />
                        <Table.HeaderCell className="exchange-lay">Lay</Table.HeaderCell>
                        <Table.HeaderCell className="exchange-lay" />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    { market.runners.map((runner) => (
                        <Table.Row key={ runner.id }>
                            <Table.Cell textAlign="left">
                                <b>{ runner.name }</b>
                            </Table.Cell>
                            { [ 0, 1 ].map((i) => (
                                runner.toBack[i]
                                    ? priceCell(runner, 'BACK', runner.toBack[i], i === 0)
                                    : <Table.Cell key={ 'b' + i } />
                            )) }
                            { [ 0, 1 ].map((i) => (
                                runner.toLay[i]
                                    ? priceCell(runner, 'LAY', runner.toLay[i], i === 0)
                                    : <Table.Cell key={ 'l' + i } />
                            )) }
                        </Table.Row>
                    )) }
                </Table.Body>
            </Table>

            <Button basic size="tiny" onClick={ load }>Refresh book</Button>

            <div style={{ marginTop: '1em' }}>
                <OrderTicket
                    client={ client }
                    market={ market }
                    selection={ selection }
                    onPlaced={ onOrderPlaced }
                />
            </div>
        </div>
    );

};

export default MarketView;
