import React, { useState } from 'react';
import { Button, Divider, Form, Header, Input, Label, Message, Segment } from 'semantic-ui-react';


/**
 * Test panel for the "Marbles" pool betting flow.
 *
 * Wagering layer over "Marbles On Stream" (the Steam marble-racing game that
 * pulls its entrants from Twitch chat). One round == one marble race. Players
 * place a wager on a marble (a Twitch entrant); when the race result arrives,
 * the pot pays out "winner takes 90%" — backers of the winning marble split
 * 90% of the total pool pro-rata to their stake, and the house keeps 10%.
 *
 * This exercises the proposed /v1/marbles/* endpoints end to end:
 *   createround -> placewager -> fetchround -> settleround
 *
 * @param {*} props
 * @returns
 */

const MarblesTest = (props) => {

    const [is_processing, setIsProcessing] = useState(false);
    const [operation_error, setOperationError] = useState();
    const [last_response, setLastResponse] = useState();

    // Round config / state,
    const [twitch_channel, setTwitchChannel] = useState('');
    const [currency, setCurrency] = useState('GBP');
    const [rake_bps, setRakeBps] = useState('1000'); // 1000 bps = 10% house, winner takes 90%
    const [round_id, setRoundId] = useState('');

    // Wager fields,
    const [marble_id, setMarbleId] = useState('');
    const [amount, setAmount] = useState('');

    // Settlement,
    const [winning_marble_id, setWinningMarbleId] = useState('');


    // Run an API operation, capturing the response / any error for display.
    async function run(label, fn) {
        setOperationError(undefined);
        setIsProcessing(true);
        try {
            const data = await fn();
            console.log(label, data);
            setLastResponse({ label, data });
            return data;
        }
        catch (err) {
            console.error(label, err);
            setOperationError({
                title: label + ' failed',
                msg: String(err && err.message ? err.message : err)
            });
        }
        finally {
            setIsProcessing(false);
        }
    }


    async function handleCreateRound() {
        const context = props.ecl_context;
        const data = await run('createMarblesRound', () =>
            context.createMarblesRound(twitch_channel, currency, Number(rake_bps))
        );
        // If the backend returned a round id, capture it for the next steps.
        if (data && data.round_id !== undefined) {
            setRoundId(String(data.round_id));
        }
    }

    async function handleFetchRound() {
        const context = props.ecl_context;
        await run('fetchMarblesRound', () =>
            context.fetchMarblesRound(round_id)
        );
    }

    async function handlePlaceWager() {
        const context = props.ecl_context;
        await run('placeMarblesWager', () =>
            context.placeMarblesWager(round_id, marble_id, currency, amount)
        );
    }

    async function handleSettleRound() {
        const context = props.ecl_context;
        await run('settleMarblesRound', () =>
            context.settleMarblesRound(round_id, winning_marble_id)
        );
    }


    // Human-readable summary of the configured rake.
    const rake_pct = Number(rake_bps) / 100;
    const winner_pct = 100 - rake_pct;

    return (
        <div>

            <Header as="h4">
                Marbles Pool Betting
            </Header>
            <p>
                Wager layer over <em>Marbles On Stream</em>. One round = one
                marble race (entrants come from the bound Twitch channel). The
                race result settles the pot:&nbsp;
                <strong>winner takes { isNaN(winner_pct) ? '—' : winner_pct }%</strong>,
                house keeps { isNaN(rake_pct) ? '—' : rake_pct }%.
            </p>

            <Message error hidden={ operation_error === undefined }
                     header={ operation_error && operation_error.title }
                     content={ operation_error && operation_error.msg } />

            <Segment>
                <Header as="h5">1. Create round</Header>
                <Form>
                    <Form.Group widths="equal">
                        <Form.Field>
                            <Input label="Twitch channel" placeholder="channel name"
                                value={ twitch_channel }
                                onChange={ (e, { value }) => setTwitchChannel(value) } />
                        </Form.Field>
                        <Form.Field>
                            <Input label="Currency"
                                value={ currency }
                                onChange={ (e, { value }) => setCurrency(value) } />
                        </Form.Field>
                        <Form.Field>
                            <Input label="Rake (bps)" type="number"
                                value={ rake_bps }
                                onChange={ (e, { value }) => setRakeBps(value) } />
                        </Form.Field>
                    </Form.Group>
                </Form>
                <Button disabled={ is_processing } onClick={ handleCreateRound }>
                    Create Round
                </Button>
            </Segment>

            <Segment>
                <Header as="h5">Round</Header>
                <Form>
                    <Form.Field>
                        <Input label="Round id" placeholder="from create / paste existing"
                            value={ round_id }
                            onChange={ (e, { value }) => setRoundId(value) } />
                    </Form.Field>
                </Form>
                <Button disabled={ is_processing || round_id === '' }
                    onClick={ handleFetchRound }>
                    Fetch Round State
                </Button>
            </Segment>

            <Segment>
                <Header as="h5">2. Place wager</Header>
                <Form>
                    <Form.Group widths="equal">
                        <Form.Field>
                            <Input label="Marble id" placeholder="twitch entrant"
                                value={ marble_id }
                                onChange={ (e, { value }) => setMarbleId(value) } />
                        </Form.Field>
                        <Form.Field>
                            <Input label="Amount"
                                value={ amount }
                                onChange={ (e, { value }) => setAmount(value) } />
                        </Form.Field>
                    </Form.Group>
                </Form>
                <Button disabled={ is_processing || round_id === '' }
                    onClick={ handlePlaceWager }>
                    Place Wager
                </Button>
            </Segment>

            <Segment>
                <Header as="h5">3. Settle (race result)</Header>
                <Form>
                    <Form.Field>
                        <Input label="Winning marble id" placeholder="reported from Twitch race"
                            value={ winning_marble_id }
                            onChange={ (e, { value }) => setWinningMarbleId(value) } />
                    </Form.Field>
                </Form>
                <Button disabled={ is_processing || round_id === '' }
                    onClick={ handleSettleRound }>
                    Settle Round
                </Button>
            </Segment>

            <Divider />

            <Header as="h5">
                Last response
                { last_response &&
                    <Label horizontal style={{ marginLeft: 8 }}>{ last_response.label }</Label> }
            </Header>
            <pre>
                { last_response ? JSON.stringify(last_response.data, null, 2) : '—' }
            </pre>

        </div>
    );

};

export default MarblesTest;
