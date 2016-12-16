import React, {Component } from 'react';
import {Match} from 'react-router';
import {Sidebar, Customers, Discounts, Orders, Reports} from './Components';
import 'semantic-ui-css/semantic.css';
import './App.css';

class App extends Component {
  render() {
    return (<div className="App">
      <Match pattern="*" component={Sidebar} />
      <div className="Main">
        <Match exactly pattern="/" component={Reports}/>
        <Match pattern="/orders" component={Orders}/>
        <Match pattern="/customers" component={Customers}/>
        <Match pattern="/discounts" component={Discounts}/>
      </div>
    </div>);
  }
}

export default App;
