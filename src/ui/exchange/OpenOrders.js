
import React, { useEffect, useState, useCallback } from 'react';
import { Segment, Table, Header, Loader, Button, Label } from 'semantic-ui-react';

import { formatPrice } from './format';

// Lists the active orders for the current platform with a cancel action.
const OpenOrders = ({ client, platform, refreshKey, onChanged }) => {

    const [ orders, setOrders ] = useState([]);
    const [ loading, setLoading ] = useState(true);
    const [ cancelling, setCancelling ] = useState(undefined);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await client.listOpenOrders(platform);
        if (res.status === 'OK') {
            setOrders(res.orders);
        }
        setLoading(false);
    }, [ client, platform ]);

    useEffect(() => {
        load();
    }, [ load, refreshKey ]);

    const handleCancel = async (orderId) => {
        setCancelling(orderId);
        await client.cancelOrder(platform, orderId);
        setCancelling(undefined);
        await load();
        if (onChanged) {
            onChanged();
        }
    };

    let body;
    if (loading) {
        body = <Loader active inline="centered" />;
    }
    else if (orders.length === 0) {
        body = <p className="exchange-empty">No open orders.</p>;
    }
    else {
        body = (
                <Table compact size="small" basic="very">
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>Selection</Table.HeaderCell>
                            <Table.HeaderCell>Side</Table.HeaderCell>
                            <Table.HeaderCell>Price</Table.HeaderCell>
                            <Table.HeaderCell>Stake</Table.HeaderCell>
                            <Table.HeaderCell />
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        { orders.map((o) => (
                            <Table.Row key={ o.orderId }>
                                <Table.Cell>{ o.runnerName }</Table.Cell>
                                <Table.Cell>
                                    <Label
                                        size="tiny"
                                        color={ o.side === 'BACK' ? 'blue' : 'pink' }
                                    >
                                        { o.side }
                                    </Label>
                                </Table.Cell>
                                <Table.Cell>
                                    { formatPrice(
                                        o.price,
                                        o.platform === 'polymarket'
                                            ? 'PROBABILITY' : 'DECIMAL_ODDS') }
                                </Table.Cell>
                                <Table.Cell>{ o.size }</Table.Cell>
                                <Table.Cell textAlign="right">
                                    <Button
                                        size="mini"
                                        basic
                                        color="red"
                                        loading={ cancelling === o.orderId }
                                        onClick={ () => handleCancel(o.orderId) }
                                    >
                                        Cancel
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        )) }
                    </Table.Body>
                </Table>
        );
    }

    return (
        <Segment>
            <Header as="h4">Open orders</Header>
            { body }
        </Segment>
    );

};

export default OpenOrders;
