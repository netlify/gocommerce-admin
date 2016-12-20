import React, {Component} from 'react';
import {Modal, Form, Message, Button} from 'semantic-ui-react';

export default class LoginForm extends Component {
  handleSubmit = (e, {formData}) => {
    e.preventDefault();

    const {loading, onLogin} = this.props;
    if (!loading) {
      onLogin(formData.email, formData.password);
    }
  };

  render() {
    const {show, loading, error} = this.props;

    return <Modal open={show} size="small">
      <Modal.Header>Login</Modal.Header>
      <Modal.Content>
        <Form error={!!error} onSubmit={this.handleSubmit}>
          <Form.Input label="Email" name="email" type="email"/>
          <Form.Input label="Password" name="password" type="password"/>
          <Message error header='Login Failed' content={error}/>
          <Button type="submit" loading={loading}>Login</Button>
        </Form>
      </Modal.Content>
    </Modal>;
  }
}
