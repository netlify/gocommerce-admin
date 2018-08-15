// @flow
import type {User} from '../Types';
import React, {Component} from 'react';
import {Menu, Icon, Container, Button, Segment} from 'semantic-ui-react';
import PeopleIcon from 'mdi-react/PeopleIcon';
import BasketIcon from 'mdi-react/BasketIcon';
import PollIcon from 'mdi-react/PollIcon'


type Props = {
  active: string,
  user: ?User,
  onLink: (e: SyntheticInputEvent) => void,
  onLogout: () => void
};

const menuItems = [
  {name: "Orders", href: "/orders", icon: <BasketIcon className="basket-icon" size={16} color="currentColor" /> },
  {name: "Customers", href: "/customers", icon: <PeopleIcon className="People-icon" size={16} color="currentColor" />},
  {name: "Reports", href: "/", icon: <PollIcon className ="poll-icon" size={16} color="currentColor" />}
];

const months = [
  "January", "February", "March",
  "April", "May", "June", "July",
  "August", "September", "October",
  "November", "December"]

const date = new Date();
const currentDate = months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear()

export default class SideBar extends Component {
  props: Props;

  render() {
    const {active, user, onLink, onLogout} = this.props;
    return <Container textAlign="center">
      <Menu horizontal secondary fixed="top" widths={3}>
      <Menu.Item className="item-left">
      {currentDate} 
      </Menu.Item>
      <Menu.Item className="item-group">
      {menuItems.map((item, i) => (
        <Menu.Item key={i} active={item.name === active} href={item.href} onClick={onLink}>
          {item.icon}
          {item.name}
        </Menu.Item>
      ))}
      </Menu.Item>
      <Menu.Item position="right">
      {user.user_metadata.firstname} {user.user_metadata.lastname} –
      <Button onClick={onLogout}><u>Logout</u></Button>
      </Menu.Item>
    </Menu>
    </Container>
  }
}
