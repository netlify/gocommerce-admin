// @flow
import type {User} from './Types';
import React, {PropTypes, Component} from 'react';
import director from 'director';
import Auth from 'netlify-auth-js';
import Commerce from 'netlify-commerce-js';
import Sidebar from './Components/Sidebar';
import {WithAuthentication, Customers, Discounts, Order, Orders, Reports} from './Components';
import 'semantic-ui-css/semantic.css';
import './App.css';
import config from './config/default.json';

const env = process.env.REACT_APP_ENV || 'dev';
const auth = new Auth({APIUrl: config.netlifyAuth});
const commerce = new Commerce({APIUrl: config.netlifyCommerce});

if (process.env.REACT_APP_SITE_URL) {
  config.siteURL = process.env.REACT_APP_SITE_URL;
}

if (process.env.REACT_APP_NETLIFY_AUTH) {
  config.siteURL = process.env.REACT_APP_NETLIFY_AUTH;
}

if (process.env.REACT_APP_NETLIFY_COMMERCE) {
  config.siteURL = process.env.REACT_APP_NETLIFY_COMMERCE;
}

type Router = {
  init: () => void,
  setRoute: (string) => void
};

function NotFound(props) {
  return <h1>Not Found!</h1>;
}

const MainComponent = {
  reports: Reports,
  orders: Orders,
  order: Order,
  customers: Customers,
  not_found: NotFound
};

class App extends Component {
  props: {};
  state: {
    user: ?User,
    route: 'reports' | 'orders' | 'order' | 'customers' | 'discounts',
    active: 'Reports' | 'Orders' | 'Customers' | 'Discounts',
    params: {},
    query: ?{}
  };

  router: Router;

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props : {}) {
    super(props);
    const user =  auth.currentUser();
    commerce.setUser(user);
    this.state = {user, route: "reports", active: "Reports", params: {}, query: null};
  }

  componentDidMount() {
    this.router = new director.Router({
      "/": () => this.setState({route: "reports", active: "Reports"}),
      "/orders": () => this.setState({route: "orders", active: "Orders"}),
      "/orders/:id": (id) => this.setState({route: "order", active: "Orders", params: {id}}),
      "/orders/:id/:item": (id, item) => this.setState({route: "order", active: "Orders", params: {id, item}}),
      "/customers": () => this.setState({route: "customers", active: "Customers"}),
    }).configure({html5history: true});
    this.router.init();
  }

  handleLogin = (email: string, password: string) => {
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

  handleLink = (e: SyntheticInputEvent) => {
    e.preventDefault();
    const path = e.target.getAttribute('href');
    if (path) {
      this.handlePush(path);
    }
  };

  handlePush = (route: string) => {
    this.router.setRoute(route);
  };

  render() {
    const {user, route, active, params, query} = this.state;

    const component = MainComponent[route] || null;

    return (<div className="App">
      <WithAuthentication user={user} onLogin={this.handleLogin}>
        <Sidebar
          active={active}
          config={config}
          user={user}
          route={route}
          onLink={this.handleLink}
          onLogout={this.handleLogout}
        />
        <div className="Main">
          {component && React.createElement(component, {
            config, route, commerce, user, params, query, push: this.handlePush, onLink: this.handleLink
          })}
        </div>
      </WithAuthentication>
    </div>);
  }
}

export default App;
