import React, {Component} from 'react';
import LoginForm from './LoginForm';

export default class WithAuthentication extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      error: null
    };
  }

  handleLogin = (email, password) => {
    this.setState({loading: true});
    this.props.onLogin(email, password)
      .then(() => {
        this.setState({loading: false, error: null});
      })
      .catch((error) => {
        this.setState({loading: false, error: (error.description || error.msg || error.error_description || error.toString())});
      });
  };

  render() {
    const {user, children} = this.props;
    const {loading, error} = this.state;
    return <div style={{height: '100%'}}>
      {!user && <LoginForm loading={loading} error={error} onLogin={this.handleLogin}/>}
      {user && children}
    </div>;
  }
}
