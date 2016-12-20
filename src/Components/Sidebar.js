import React, {PropTypes, Component} from 'react';
import {Menu, Dropdown, Icon} from 'semantic-ui-react';

const menuItems = [
  {name: "Reports", href: "/"},
  {name: "Orders", href: "/orders"},
  {name: "Customers", href: "/customers"},
  {name: "Discounts", href: "/discounts"}
];

export default class SideBar extends Component {
  static propTypes = {
    user: PropTypes.object,
    pathname: PropTypes.string,
  }

  static contextTypes = {
    router: PropTypes.object
  }

  handleLogout = (e) => {
    this.props.onLogout();
  };

  handleClick = (e) => {
    e.preventDefault();
    const href = e.target.getAttribute("href");
    this.context.router.transitionTo(href);
  };

  isActive = (href) => {
    const {pathname} = this.props;
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.substr(0, href.length) === href;
  };

  render() {
    const {user} = this.props;
    const {handleLogout, handleClick, isActive} = this;

    return <Menu vertical fixed="left" inverted onItemClick={this.handleNavItem}>
      <Menu.Item as={Dropdown} trigger={<span><Icon name="user"/>{user.email}</span>}>
        <Dropdown.Menu>
          <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
        </Dropdown.Menu>
      </Menu.Item>
      {menuItems.map((item, i) => (
        <Menu.Item key={i} active={isActive(item.href)} href={item.href} onClick={handleClick}>
          {item.name}
        </Menu.Item>
      ))}
    </Menu>;
  }
}
