import React, {PropTypes, Component} from 'react';
import {Menu} from 'semantic-ui-react';

const menuItems = [
  {name: "Reports", href: "/"},
  {name: "Orders", href: "/orders"},
  {name: "Customers", href: "/customers"},
  {name: "Discounts", href: "/discounts"}
];

export default class SideBar extends Component {
  static propTypes = {
    params: PropTypes.object,
    pathname: PropTypes.string,
    location: PropTypes.object,
    isExact: PropTypes.bool
  }

  static contextTypes = {
     router: PropTypes.object
   }

  handleNavItem = (e) => {
    e.preventDefault();
    this.context.router.transitionTo(e.target.getAttribute("href"));
  };

  render() {
    const {onNav, pathname} = this.props;
    let activeIndex = 0;
    menuItems.forEach((item, index) => {
      if (pathname.substr(0, item.href.length) === item.href) {
        activeIndex = index;
      }
    });

    return <Menu vertical fixed="left" inverted items={menuItems} activeIndex={activeIndex} onItemClick={this.handleNavItem}/>;
  }
}
