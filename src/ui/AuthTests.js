import React, { useState } from 'react';
import { Header, Tab } from 'semantic-ui-react';

import DepositTest from './DepositTest.js';
import DepositJSTest2 from './DepositJSTest2.js';
import WithdrawalTest from './WithdrawalTest.js';

import PromotionsTest from './PromotionsTest.js';
import MarblesTest from './MarblesTest.js';


const AuthTests = (props) => {

    const panes = [
        {
            menuItem: 'Card Deposit JS',
            render: () =>
                <Tab.Pane><DepositJSTest2 ecl_context={ props.ecl_context } /></Tab.Pane>

        },
        {
            menuItem: 'Card Withdrawal',
            render: () =>
                <Tab.Pane><WithdrawalTest ecl_context={ props.ecl_context } /></Tab.Pane>
        },
        // add more tabs as needed

        {
            menuItem: 'Promotions Test',
            render: () =>
                <Tab.Pane><PromotionsTest ecl_context={ props.ecl_context } /></Tab.Pane>
        },

        {
            menuItem: 'Marbles Pool',
            render: () =>
                <Tab.Pane><MarblesTest ecl_context={ props.ecl_context } /></Tab.Pane>
        }

    ];

    return (
        <div>
            <Header as="h3">
                Client Tests
            </Header>

            <Tab panes={panes} />
        </div>
    );

};

export default AuthTests;
