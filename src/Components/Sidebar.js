import React, {Component} from 'react';
import {Menu, Dropdown, Icon} from 'semantic-ui-react';

const menuItems = [
  {name: "Reports", href: "/"},
  {name: "Orders", href: "/orders"},
  {name: "Customers", href: "/customers"},
  {name: "Discounts", href: "/discounts"}
];

export default class SideBar extends Component {
  render() {
    const {active, user, onLink, onLogout} = this.props;

    return <Menu vertical fixed="left" inverted>
      <Menu.Item as={Dropdown} trigger={<span><Icon name="user"/>{user.email}</span>}>
        <Dropdown.Menu>
          <Dropdown.Item onClick={onLogout}>Logout</Dropdown.Item>
        </Dropdown.Menu>
      </Menu.Item>
      {menuItems.map((item, i) => (
        <Menu.Item key={i} active={item.name === active} href={item.href} onClick={onLink}>
          {item.name}
        </Menu.Item>
      ))}
    </Menu>;
  }
}
