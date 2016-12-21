import React, {Component} from "react";
import {Button, Form} from "semantic-ui-react";

export default class AddressEditor extends Component {
  constructor(props) {
    super(props);
    this.state = props.order ? Object.assign({}, props.order[props.item]) : {};
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.order && !this.props.order) {
      this.setState(Object.assign({}, nextProps.order[nextProps.item]));
    }
  }

  handleChange = (e) => {
    this.setState({[e.target.name]: e.target.value});
  };

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.onSave(this.props.item, this.state);
  };

  render() {
    const {order, item, onLink, onSave} = this.props;
    if (!order) { return null; }

    const addr = this.state;

    return <Form onSubmit={this.handleSubmit}>
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
