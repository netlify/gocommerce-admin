import React, {Component} from 'react';
import {Grid, Header, Form, Message, Button, } from 'semantic-ui-react';

export default class LoginForm extends Component {
  handleSubmit = (e, {formData}) => {
    e.preventDefault();
    const {loading, onLogin} = this.props;
    if (!loading) {
      onLogin(formData.email, formData.password);
    }
  };

  render() {
    const {loading, error} = this.props;

    return <Grid textAlign='center' style={{ height: '100%' }} verticalAlign='middle'>
        <Grid.Column style={{ maxWidth: "330px" }}>
          <Header size='medium' color="blue" textAlign='center'>Sign In to GoCommerce</Header>
          <Form error={!!error} onSubmit={this.handleSubmit}>
            <Form.Input placeholder="Email" name="email" type="email" />
            <Form.Input placeholder="Password" name="password" type="password" />
            <Message error header='Login Failed' content={error} />
            <Button type="submit" primary style={{ width: "100%" }} loading={loading}>Sign In</Button>
          </Form>
        </Grid.Column>
      </Grid>;
  }
}
