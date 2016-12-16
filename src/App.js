import React, { Component } from 'react';
import {Menu} from 'semantic-ui-react';
import 'semantic-ui-css/semantic.css';

const menuItems = [
  {active: true, name: "Reports"},
  {name: "Orders"},
  {name: "Customers"},
  {name: "Discounts"}
];

class App extends Component {
  render() {
    return (
      <Menu vertical fixed="left" inverted items={menuItems}/>
    );
  }
}

export default App;
