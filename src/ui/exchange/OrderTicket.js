
import React, { useState, useEffect } from 'react';
import { Segment, Form, Button, Label, Message, Header } from 'semantic-ui-react';

import { formatPrice, estimateProfit } from './format';

// Bet/order entry ticket. `selection` carries the runner + side + suggested
// price chosen from the order book; the user can adjust price and stake before
// submitting. On success the parent is notified so balances / open orders can
// refresh.
const OrderTicket = ({ client, market, selection, onPlaced }) => {

    const [ price, setPrice ] = useState('');
    const [ size, setSize ] = useState('');
    const [ submitting, setSubmitting ] = useState(false);
    const [ result, setResult ] = useState(undefined);

    // Prefill the price whenever a new selection comes in from the order book.
    useEffect(() => {
        if (selection) {
            setPrice(String(selection.price));
            setResult(undefined);
        }
    }, [ selection ]);

    if (!selection) {
        return (
            <Segment placeholder textAlign="center">
                <Header sub disabled>
                    Select a price in the order book to place a bet
                </Header>
            </Segment>
        );
    }

    const priceType = market.priceType;
    const profit = estimateProfit(selection.side, price, size, priceType);

    const handleSubmit = async () => {
        setSubmitting(true);
        setResult(undefined);
        const res = await client.placeOrder({
            platform: market.platform,
            marketId: market.id,
            runnerId: selection.runnerId,
            runnerName: selection.runnerName,
            side: selection.side,
            price: Number(price),
            size: Number(size),
        });
        setSubmitting(false);
        setResult(res);
        if (res.status === 'OK') {
            setSize('');
            onPlaced(res.order);
        }
    };

    const sideColor = selection.side === 'BACK' ? 'blue' : 'pink';

    return (
        <Segment>
            <Label ribbon color={ sideColor }>
                { selection.side } { selection.runnerName }
            </Label>

            <Form style={{ marginTop: '1em' }}>
                <Form.Group widths="equal">
                    <Form.Input
                        label={ priceType === 'PROBABILITY' ? 'Price (0-1)' : 'Odds' }
                        type="number"
                        step="any"
                        value={ price }
                        onChange={ (e) => setPrice(e.target.value) }
                    />
                    <Form.Input
                        label="Stake"
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={ size }
                        onChange={ (e) => setSize(e.target.value) }
                    />
                </Form.Group>

                <div className="exchange-ticket-summary">
                    <span>Price: <b>{ formatPrice(Number(price), priceType) }</b></span>
                    <span>
                        Est. { selection.side === 'BACK' ? 'profit' : 'liability' }:{' '}
                        <b>{ profit.toFixed(2) }</b>
                    </span>
                </div>

                <Button
                    fluid
                    color={ sideColor }
                    loading={ submitting }
                    disabled={ submitting || !price || !size }
                    onClick={ handleSubmit }
                >
                    Place { selection.side }
                </Button>
            </Form>

            { result && result.status === 'OK' && (
                <Message positive size="tiny">
                    Order { result.order.orderId } { result.order.status.toLowerCase() }
                </Message>
            ) }
            { result && result.status !== 'OK' && (
                <Message negative size="tiny">
                    Failed: { result.status }
                </Message>
            ) }
        </Segment>
    );

};

export default OrderTicket;
