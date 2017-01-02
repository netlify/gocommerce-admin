// @flow
import type {Order, Address} from '../../Types';
import React, {Component} from "react";
import {Button, Form} from "semantic-ui-react";

type Props = {
  order: Order,
  item: 'shipping_address' | 'billing_address'
};
export default class AddressEditor extends Component {
  state: {
    addr: ?Address
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      addr: props.order ? Object.assign({}, props.order[props.item]) : null
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.order && !this.props.order) {
      this.setState({addr: Object.assign({}, nextProps.order[nextProps.item])});
    }
  }

  handleChange = (e: SyntheticEvent) => {
    if (e.target instanceof HTMLInputElement && e.target.name && e.target.value){
      this.setState({addr: {
        ...this.state.addr,
        [e.target.name]: e.target.value
      }});
    }
  };

  handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    this.props.onSave(this.props.item, this.state);
  };

  render() {
    const {order, onLink} = this.props;
    if (!order) { return null; }

    const addr = this.state.addr;

    return addr &&
      <Form onSubmit={this.handleSubmit}>
        <Form.Group widths="equal">
          <Form.Input label="First Name" name="first_name" value={addr.first_name} onChange={this.handleChange}/>
          <Form.Input label="Last Name" name="last_name" value={addr.last_name} onChange={this.handleChange}/>
        </Form.Group>
        <Form.Group widths="equal">
          <Form.Input label="Country" name="country" value={addr.country} onChange={this.handleChange}/>
          <Form.Input label="State/Province" name="state" value={addr.state} onChange={this.handleChange}/>
          <Form.Input label="Postal Code" name="zip" value={addr.zip} onChange={this.handleChange}/>
        </Form.Group>
        <Form.Group widths="equal">
          <Form.Input label="Street Address" name="address1" value={addr.address1} onChange={this.handleChange}/>
          <Form.Input label="App/Suite" name="address2" value={addr.address2} onChange={this.handleChange}/>
        </Form.Group>
        <Form.Group widths="equal">
          <Form.Input label="Company (optional)" name="company" value={addr.company} onChange={this.handleChange}/>
        </Form.Group>
        <Button type="submit">Save</Button> or <a href={`/orders/${order.id}`} onClick={onLink}>Cancel</a>
      </Form>;
    }
}
