import React, { Component } from 'react';
import { Button, Form, Segment, Input, Label } from 'semantic-ui-react';

import Login from './Login.js';
import AuthTests from './AuthTests.js';

class Main extends Component {

    state = {
        domain: 'paymenttests.korex.bet',
        product_name: 'korex',
        logged_in_state: this.props.logged_in_state,
        controls_disabled: false,
        login_error_msg: ''
    };

    handleConnect = async () => {
        this.setState({
            controls_disabled: true
        });
        const context = this.props.ecl_context;
        await context.loadSession('https://' + this.state.domain, '');
        this.setState({
            logged_in_state: context.getLoggedInState(),
            controls_disabled: false
        });
    };

    handleDomainChange = (e) => {
        this.setState({ domain: e.target.value });
    };

    handleProductNameChange = (e) => {
        this.setState({ product_name: e.target.value });
    };

    handleLogoutAction = async (e) => {
        this.setState({
            controls_disabled: true
        });
        const context = this.props.ecl_context;
        await context.logout();
        this.setState({
            logged_in_state: context.getLoggedInState(),
            controls_disabled: false
        });
    };

    handleLoginAction = async (username, password) => {
        this.setState({
            controls_disabled: true
        });

        const product_name = this.state.product_name;

        const context = this.props.ecl_context;
        const response =
                await context.authenticateByEmail(
                        product_name, username, password, undefined);

        let login_error_msg = '';

        if (response.status !== 'OK') {
            login_error_msg = JSON.stringify(response, null, 1);
        }

        this.setState({
            logged_in_state: context.getLoggedInState(),
            login_error_msg,
            controls_disabled: false
        });

    };

    render() {

        const context = this.props.ecl_context;
        const logged_in_state = this.state.logged_in_state;

        let content;

        // If logged in state is 'unauthorised',
        if (logged_in_state === 'unauth') {
            content = (
                <Login
                    ecl_context = { this.props.ecl_context }
                    onLoginAction = { this.handleLoginAction }
                    disabled = { this.state.controls_disabled }
                    error_msg = { this.state.login_error_msg }
                />
            );
        }

        // If logged in state is 'authorised',
        else if (logged_in_state === 'auth') {
            content = (
                <AuthTests
                    ecl_context = { this.props.ecl_context }
                />
            );
        }

        return (
            <div>
                <Segment>

                    <Form>
                        <Form.Group>
                            <Form.Field inline width = {8} >
                                <Input
                                    label="http://"
                                    placeholder="Domain"
                                    value={ this.state.domain }
                                    onChange={this.handleDomainChange}
                                    action={{
                                        content: "Connect",
                                        onClick: () => this.handleConnect()
                                    }}
                                />
                            </Form.Field>
                            <Form.Field inline width = {4} >
                                <Input
                                    label="Product"
                                    placeholder="Product Name"
                                    value={ this.state.product_name }
                                    onChange={ this.handleProductNameChange }
                                />
                            </Form.Field>
                            <Form.Field width = {2} >
                                <Button
                                    content="Logout"
                                    onClick={ this.handleLogoutAction }
                                />
                            </Form.Field>
                            <Form.Field width = {2}>
                                <Label>
                                    Connect: { logged_in_state }
                                </Label>
                            </Form.Field>
                        </Form.Group>
                    </Form>

                </Segment>

                <Segment>
                    { content }
                </Segment>

            </div>
        );
    }

}

export default Main;
