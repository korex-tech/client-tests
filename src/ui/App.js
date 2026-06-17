
import './App.css';

import React, { useState } from 'react';

import { Routes, Route } from 'react-router-dom';

import Main from './Main';
import CompleteDeposit from './CompleteDeposit';
import MarblesPage from './MarblesPage';



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

    const MarblesRoute = () => {
        const context = props.ecl_context;
        return (
            <MarblesPage
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
                    <Route path="marbles" element={ MarblesRoute() } />
                </Route>
            </Routes>
        </div>
    );

};

export default App;
