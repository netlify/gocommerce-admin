import React, {PropTypes, Component} from 'react';
import {Match} from 'react-router';
import Auth from 'netlify-auth-js';
import Commerce from 'netlify-commerce-js';
import jwtDecode from 'jwt-decode';
import {WithAuthentication, Sidebar, Customers, Discounts, Order, Orders, Reports} from './Components';
import 'semantic-ui-css/semantic.css';
import './App.css';

const env = process.env.REACT_APP_ENV || 'dev';
const config = require(`./config/${env}.json`);
const auth = new Auth({APIUrl: config.netlifyAuth});
const commerce = new Commerce({APIUrl: config.netlifyCommerce});

class App extends Component {
  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);
    const user =  auth.currentUser();
    commerce.setUser(user);
    this.state = {user};
  }

  handleLogin = (email, password) => {
    return auth.login(email, password)
      .then((user) => {
        user.persistSession(user);
        commerce.setUser(user);
        this.setState({user});
        return user;
      });
  };

  handleLogout = () => {
    const {user} = this.state;
    user && user.logout();
    this.setState({user: null});
  };


  handleLink = (e) => {
    e.preventDefault();
    this.context.router.transitionTo(e.target.getAttribute('href'));
  };


  render() {
    const {user} = this.state;
    console.log('Token: ', user && user.jwt_token && jwtDecode(user.jwt_token));

    return (<div className="App">
      <WithAuthentication user={user} onLogin={this.handleLogin}>
        <Match pattern="*" component={(props) => <Sidebar config={config} user={user} onLogout={this.handleLogout} {...props}/>} />
        <div className="Main">
          <Match exactly pattern="/" component={Reports}/>
          <Match exactly pattern="/orders" component={(props) => <Orders config={config} commerce={commerce} onLink={this.handleLink} {...props}/>}/>
          <Match exactly pattern="/orders/:id" component={(props) => <Order config={config} commerce={commerce} onLink={this.handleLink} {...props}/>}/>
          <Match exactly pattern="/customers" component={(props) => <Customers config={config} commerce={commerce} onLink={this.handleLink} {...props}/>}/>
          <Match exactly pattern="/discounts" component={Discounts}/>
        </div>
      </WithAuthentication>
    </div>);
  }
}

export default App;
