
import './App.css';

import React, { useState } from 'react';

import { Routes, Route } from 'react-router-dom';

import Main from './Main';
import CompleteDeposit from './CompleteDeposit';
import ExchangeDashboard from './exchange/ExchangeDashboard';



const App = (props) => {

    const MainRoute = () => {
        const context = props.ecl_context;
        return (
            <Main
                ecl_context={ context }
                logged_in_state={ context.getLoggedInState() }
            />
        );
    };

    const CompleteDepositRoute = () => {
        const context = props.ecl_context;
        return (
            <CompleteDeposit
                ecl_context={ context }
            />
        );
    };

    return (
        <div className="App">
            <Routes>
                <Route path="/">
                    <Route index element={ MainRoute() } />
                    <Route path="complete" element={ CompleteDepositRoute() } />
                    <Route path="exchange" element={ <ExchangeDashboard /> } />
                </Route>
            </Routes>
        </div>
    );

};

export default App;
