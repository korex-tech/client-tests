import React, { useCallback, useEffect, useState } from 'react';
import {
    Button, Card, Checkbox, Container, Divider, Header, Input,
    Label, Message, Segment, Statistic
} from 'semantic-ui-react';


// Player-facing Marbles page.
//
// This is a prototype that lives in the test client; it is written against the
// proposed /v1/marbles/* contract so it can be lifted into the real player
// frontend (matchpoint-client) once the backend endpoints exist.
//
// Flow:
//   1. Opt-in gate  — the player must explicitly consent to take part before
//      any wager UI is shown. Wagering is gated on this consent server-side
//      (setMarblesOptIn) and remembered locally so we don't re-prompt.
//   2. Active round — load the current open round for the channel, its entrant
//      marbles (Twitch users who joined the race) and the live pool.
//   3. Place wager  — stake on a marble; pot pays winner-takes-90%.
//   4. Result       — once the round settles, show the winning marble.

const OPT_IN_STORAGE_KEY = 'marbles_opted_in';

// The Twitch channel this page is bound to. In the real frontend this would
// come from product config / route params; hard-coded here for the prototype.
const DEFAULT_CHANNEL = 'korexmarbles';


const MarblesPage = (props) => {

    const context = props.ecl_context;

    const [opted_in, setOptedIn] = useState(
        () => window.localStorage.getItem(OPT_IN_STORAGE_KEY) === '1'
    );
    const [consent_checked, setConsentChecked] = useState(false);

    const [round, setRound] = useState();
    const [is_loading, setIsLoading] = useState(false);
    const [error, setError] = useState();

    const [selected_marble, setSelectedMarble] = useState();
    const [amount, setAmount] = useState('');
    const [notice, setNotice] = useState();


    const channel = DEFAULT_CHANNEL;


    const loadRound = useCallback(async () => {
        setError(undefined);
        setIsLoading(true);
        try {
            const data = await context.fetchActiveMarblesRound(channel);
            setRound(data);
        }
        catch (err) {
            setError('Could not load the current round. ' +
                'Is the backend connected? (' + String(err && err.message) + ')');
        }
        finally {
            setIsLoading(false);
        }
    }, [context, channel]);


    // Load the active round once the player has opted in.
    useEffect(() => {
        if (opted_in) {
            loadRound();
        }
    }, [opted_in, loadRound]);


    async function handleOptIn() {
        setError(undefined);
        try {
            // Record consent server-side; tolerate the endpoint not existing
            // yet (prototype) by still remembering locally.
            await context.setMarblesOptIn(true);
        }
        catch (err) {
            console.warn('setMarblesOptIn failed (endpoint may not exist yet):', err);
        }
        window.localStorage.setItem(OPT_IN_STORAGE_KEY, '1');
        setOptedIn(true);
    }

    async function handleOptOut() {
        try {
            await context.setMarblesOptIn(false);
        }
        catch (err) {
            console.warn('setMarblesOptIn failed:', err);
        }
        window.localStorage.removeItem(OPT_IN_STORAGE_KEY);
        setOptedIn(false);
        setConsentChecked(false);
        setRound(undefined);
    }

    async function handlePlaceWager() {
        setNotice(undefined);
        setError(undefined);
        if (round === undefined || round.round_id === undefined) {
            setError('No open round to bet on.');
            return;
        }
        if (selected_marble === undefined) {
            setError('Pick a marble first.');
            return;
        }
        setIsLoading(true);
        try {
            const resp = await context.placeMarblesWager(
                round.round_id, selected_marble, round.currency, amount);
            setNotice('Wager placed: ' + JSON.stringify(resp));
            setAmount('');
            await loadRound();
        }
        catch (err) {
            setError('Could not place wager. (' + String(err && err.message) + ')');
        }
        finally {
            setIsLoading(false);
        }
    }


    // --- Opt-in gate --------------------------------------------------------
    if (!opted_in) {
        return (
            <Container text style={{ marginTop: 32 }}>
                <Header as="h2">🎱 Marbles</Header>
                <Segment padded>
                    <Header as="h4">Take part in Marbles rounds</Header>
                    <p>
                        Marbles is a pooled prediction round on a live marble
                        race. You stake on a marble; if it wins, backers split
                        <strong> 90% of the pool</strong> in proportion to their
                        stake (the house keeps 10%).
                    </p>
                    <p>
                        Marbles is an <strong>optional novelty round</strong> and
                        separate from the main sportsbook. By opting in you
                        confirm you want it shown on your account and that you
                        accept the round rules.
                    </p>
                    <Checkbox
                        label="I want to take part in Marbles rounds and accept the round rules."
                        checked={ consent_checked }
                        onChange={ (e, { checked }) => setConsentChecked(checked) }
                    />
                    <Divider hidden />
                    <Button primary disabled={ !consent_checked } onClick={ handleOptIn }>
                        Opt in
                    </Button>
                </Segment>
            </Container>
        );
    }


    // --- Round view ---------------------------------------------------------
    const marbles = (round && round.marbles) || [];
    const status = (round && round.status) || 'unknown';
    const pool_total = (round && round.pool_total);
    const winning_marble_id = (round && round.winning_marble_id);

    return (
        <Container style={{ marginTop: 32 }}>
            <Header as="h2">
                🎱 Marbles
                <Header.Subheader>Channel: { channel }</Header.Subheader>
            </Header>

            <Button size="tiny" basic floated="right" onClick={ handleOptOut }>
                Opt out
            </Button>
            <Button size="tiny" basic floated="right" loading={ is_loading }
                onClick={ loadRound }>
                Refresh
            </Button>

            <Divider clearing />

            { error &&
                <Message error header="Something went wrong" content={ error } /> }
            { notice &&
                <Message positive content={ notice } /> }

            { round === undefined
                ? <Message info content={ is_loading
                    ? 'Loading the current round…'
                    : 'No open round right now. Check back when a race starts.' } />
                : <div>
                    <Statistic.Group size="small" widths="three">
                        <Statistic>
                            <Statistic.Value>{ status }</Statistic.Value>
                            <Statistic.Label>Round status</Statistic.Label>
                        </Statistic>
                        <Statistic>
                            <Statistic.Value>
                                { pool_total !== undefined ? pool_total : '—' }
                            </Statistic.Value>
                            <Statistic.Label>Pool ({ round.currency })</Statistic.Label>
                        </Statistic>
                        <Statistic>
                            <Statistic.Value>{ marbles.length }</Statistic.Value>
                            <Statistic.Label>Marbles</Statistic.Label>
                        </Statistic>
                    </Statistic.Group>

                    <Divider />

                    <Header as="h4">Pick a marble</Header>
                    <Card.Group itemsPerRow={ 4 }>
                        { marbles.map((m) => {
                            const id = m.marble_id !== undefined ? m.marble_id : m;
                            const is_winner = winning_marble_id !== undefined &&
                                winning_marble_id === id;
                            return (
                                <Card key={ id }
                                    color={ selected_marble === id ? 'purple' : undefined }
                                    onClick={ status === 'OPEN'
                                        ? () => setSelectedMarble(id)
                                        : undefined }
                                    raised={ selected_marble === id }>
                                    <Card.Content>
                                        <Card.Header>{ id }</Card.Header>
                                        <Card.Meta>
                                            pool: { m.pool !== undefined ? m.pool : '—' }
                                        </Card.Meta>
                                        { is_winner &&
                                            <Label corner="right" color="green"
                                                icon="trophy" /> }
                                    </Card.Content>
                                </Card>
                            );
                        }) }
                    </Card.Group>

                    { status === 'OPEN'
                        ? <Segment>
                            <Header as="h5">
                                Stake on { selected_marble || '— pick a marble —' }
                            </Header>
                            <Input
                                label={ round.currency }
                                placeholder="amount"
                                value={ amount }
                                onChange={ (e, { value }) => setAmount(value) }
                                action={{
                                    content: 'Place wager',
                                    primary: true,
                                    loading: is_loading,
                                    disabled: is_loading || selected_marble === undefined ||
                                        amount === '',
                                    onClick: handlePlaceWager
                                }}
                            />
                        </Segment>
                        : <Message info
                            header={ status === 'SETTLED' ? 'Round settled' : 'Betting closed' }
                            content={ winning_marble_id !== undefined
                                ? ('Winning marble: ' + winning_marble_id)
                                : 'This round is no longer accepting wagers.' } />
                    }
                </div>
            }
        </Container>
    );

};

export default MarblesPage;
