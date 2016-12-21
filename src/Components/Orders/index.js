import React, {Component} from 'react';
import {Breadcrumb, Checkbox, Grid, Dimmer, Divider, Dropdown, Loader, Menu, Table} from 'semantic-ui-react';
import Layout from '../Layout';
import ErrorMessage from '../Messages/Error';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import './Orders.css';


function formatField(label, order) {
  return order[label.toLowerCase().replace(/ /, '_')];
}

function formatLineItems(order) {
  return order.line_items && order.line_items.map((item) => <span key={item.id}>
    {item.quantity} x “{item.title}” <br/>
</span>)
}

function formatAddress(field) {
  return (order) => {
    const addr = order[field];
    return addr && <div>
      {addr.first_name} {addr.last_name}<br/>
      {addr.company && <span>{addr.company}<br/></span>}
      {addr.address1}<br/>
      {addr.address2 && <span>{addr.address2}<br/></span>}
      {addr.city}, {addr.zip}, {addr.state && `${addr.state}, `} {addr.country}
    </div>;
  };
}

function formatPriceField(field) {
  return (order) => {
    const amount = (order[field] / 100).toFixed(2);
    switch(order.currency) {
      case "USD":
        return `$${amount}`;
      case "EUR":
        return `${amount}€`;
      default:
        return `${amount} ${order.currency}`;
    }
  };
}

function formatDateField(field) {
  return (order) => distanceInWordsToNow(order[field]) + " ago";
}

const fields = {
  ID: {},
  Email: {sort: "email"},
  Items: {fn: formatLineItems},
  "Shipping Address": {fn: formatAddress("shipping_address")},
  "Billing Address": {fn: formatAddress("billing_address")},
  Taxes: {sort: "taxes", fn: formatPriceField("taxes")},
  Subtotal: {sort: "subtotal", fn: formatPriceField("subtotal")},
  "Shipping State": {fn: (order) => order.fulfillment_state},
  "Payment State": {},
  Total: {sort: "total", fn: formatPriceField("total")},
  "Created At": {sort: "created_at", fn: formatDateField("created_at")},
  "Updated At": {sort: "updated_at", fn: formatDateField("updated_at")}
};

const enabledFields = {
  ID: false,
  Items: true,
  Email: true,
  "Shipping Address": false,
  "Billing Address": false,
  "Shipping State": true,
  "Payment State": true,
  Taxes: false,
  Subtotal: false,
  Total: true,
  "Created At": true,
  "Updated At":false
};

class Order extends Component {
  handleClick = (e) => {
    this.props.onLink({
      preventDefault: e.preventDefault,
      target: {getAttribute: (a) => ({href: `/orders/${this.props.order.id}`}[a])}
    });
  };

  render() {
    const {order, enabledFields} = this.props;

    return <Table.Row className="tr-clickable" onClick={this.handleClick}>
      {Object.keys(enabledFields).map((field) => enabledFields[field] && <Table.Cell key={field}>
        {fields[field].fn ? fields[field].fn(order) : formatField(field, order)}
      </Table.Cell>)}
    </Table.Row>;
  }
}

export default class Orders extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      enabledFields: Object.assign({}, enabledFields)
    };
  }

  componentDidMount() {
    this.props.commerce.orderHistory({user_id: "all"})
      .then((orders) => {
        console.log("Loaded orders: %o", orders);
        this.setState({loading: false, orders: orders});
      })
      .catch((error) => {
        console.log("Error loading orders: %o", error);
        this.setState({loading: false, error});
      });
  }

  handleToggleField = (e, el) => {
    const {enabledFields} = this.state;
    const updated = Object.assign({}, enabledFields, {[el.name]: !enabledFields[el.name]});
    console.log("Updated fields: %o", updated);
    this.setState({enabledFields: updated});
  };

  render() {
    const {onLink} = this.props;
    const {loading, error, orders, enabledFields} = this.state;

    return <Layout breadcrumb={[{label: "Orders", href: "/orders"}]} onLink={onLink} menu={
      <Menu compact>
        <Dropdown simple text="Fields" className="item">
          <Dropdown.Menu className="orders-left-menu">
            {Object.keys(enabledFields).map((field) => <Dropdown.Item key={field}>
              <Checkbox name={field} label={field} checked={enabledFields[field]} onChange={this.handleToggleField}/>
            </Dropdown.Item>)}
          </Dropdown.Menu>
        </Dropdown>
      </Menu>
    }>
      <Dimmer.Dimmable dimmed={loading}>
        <ErrorMessage error={error}/>
        <Dimmer active={loading}>
            <Loader active={loading}>Loading orders...</Loader>
        </Dimmer>
        <Table celled striped selectable>
          <Table.Header>
            <Table.Row>
              {Object.keys(enabledFields).map((field) => enabledFields[field] && <Table.HeaderCell key={field}>
                {field}
              </Table.HeaderCell>)}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {orders && orders.map((order) => (
              <Order key={order.id} order={order} enabledFields={enabledFields} onLink={onLink}/>
            ))}
          </Table.Body>
        </Table>
      </Dimmer.Dimmable>
    </Layout>;
  }
}
