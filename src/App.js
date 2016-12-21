import React, {PropTypes, Component} from 'react';
import Navigo from 'navigo';
import Auth from 'netlify-auth-js';
import Commerce from 'netlify-commerce-js';
import {WithAuthentication, Sidebar, Customers, Discounts, Order, Orders, Reports} from './Components';
import 'semantic-ui-css/semantic.css';
import './App.css';

const env = process.env.REACT_APP_ENV || 'dev';
const config = require(`./config/${env}.json`);
const auth = new Auth({APIUrl: config.netlifyAuth});
const commerce = new Commerce({APIUrl: config.netlifyCommerce});

function NotFound(props) {
  return <h1>Not Found!</h1>;
}

const MainComponent = {
  reports: Reports,
  orders: Orders,
  order: Order,
  customers: Customers,
  discounts: Discounts,
  not_found: NotFound
};

const router = new Navigo();

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

  componentDidMount() {
    router.on({
      "/": () => this.setState({route: "reports", active: "Reports"}),
      "/orders": () => this.setState({route: "orders", active: "Orders"}),
      "/orders/:id": (params) => this.setState({route: "order", active: "Orders", params}),
      "/orders/:id/:item": (params) => this.setState({route: "order", active: "Orders", params}),
      "/customers": () => this.setState({route: "customers", active: "Customers"}),
      "/discounts": () => this.setState({route: "discounts", active: "Discounts"})
    }).notFound(() => {
      this.setState({route: "not_found"})
    }).resolve();
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
    router.navigate(e.target.getAttribute('href'));
  };

  handlePush = (route) => {
    router.navigate(route);
  };

  render() {
    const {user, route, active, params} = this.state;

    const component = MainComponent[route] || null;
    console.log("Component for route: %o", route, component);

    return (<div className="App">
      <WithAuthentication user={user} onLogin={this.handleLogin}>
        <Sidebar active={active} config={config} user={user} route={route} onLink={this.handleLink} onLogout={this.handleLogout}/>
        <div className="Main">
          {component && React.createElement(component, {
            config, route, commerce, user, params, push: this.handlePush, onLink: this.handleLink
          })}
        </div>
      </WithAuthentication>
    </div>);
  }
}

export default App;
