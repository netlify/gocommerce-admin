import React, {PropTypes, Component} from 'react';
import format from 'date-fns/format';
import {Breadcrumb, Button, Divider, Form, Grid, Header, List, Message, Segment, Table} from 'semantic-ui-react';
import Layout from '../Layout';
import ErrorMessage from '../Messages/Error';
import Address from './Address';
import AddressEditor from './AddressEditor';
import './styles.css';

function formatId(id) {
  return id.split("-").pop();
}

function formatPrice(value, currency) {
  const amount = (value / 100).toFixed(2);
  switch(currency) {
    case "USD":
      return `$${amount}`;
    case "EUR":
      return `${amount}€`;
    default:
      return `${amount} ${currency}`;
  }
}

function formatItemTypes(items) {
  if (!items) { return null; }

  const types = {};
  items.forEach((item) => {
    types[item.type] = types[item.type] || 0;
    types[item.type] += item.quantity;
  });
  return Object.keys(types).map((type) => `${types[type]}x${type}`).join(', ');
}

function formatTransactionType(type) {
  return {
    "charge": "paid",
    "refund": "refunded"
  }[type];
}

const EditableItems = {
  "shipping_address": AddressEditor,
  "billing_address": AddressEditor
};

export default class Order extends Component {
  static propTypes = {
    params: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {loading: true, error: false};
  }

  componentDidMount() {
    const {params} = this.props;
    this.props.commerce.orderDetails(params.id)
      .then((order) => {
        this.setState({loading: false, order});
        order.user_id && this.props.commerce.userDetails(order.user_id)
          .then((customer) => this.setState({customer}));
      })
      .catch((error) => {
        console.error("Error loading order: %o", error);
        this.setState({loading: false, error});
      });
  }

  handleSave = (item, data) => {
    const {commerce, push} = this.props;
    const {order} = this.state;

    this.setState({loading: true});
    commerce.updateOrder(order.id, {[item]: data})
      .then((order) => {
        push(`/orders/${order.id}`);
        this.setState({loading: false, error: null, order});
      })
      .catch((error) => {
        console.error("Error updating order: %o");
        this.setState({loading: false, error});
      })
  };

  handleShippingUpdate = (e) => {
    e.preventDefault();
    const {newFullfilementState} = this.state;
    this.handleSave("fulfillment_state", newFullfilementState);
  }

  handleChangeShippingState = (e, el) => {
    this.setState({newFullfilementState: el.value});
  };

  render() {
    const {config, params, onLink} = this.props;
    const {customer, loading, error, order, newFullfilementState} = this.state;

    const item = params.item && EditableItems[params.item] || null;

    return <Layout
      breadcrumb={[{label: "Orders", href: "/orders"}, {label: formatId(params.id), href: `/orders/${params.id}`}]}
      onLink={onLink}
    >
      <ErrorMessage error={error}/>

      <Grid columns="equal">
        <Grid.Row>
          <Grid.Column>
            <Segment loading={loading}>
              <Header as="h2" dividing>
                Order Details
                <Header.Subheader>
                  {params.id}
                </Header.Subheader>
              </Header>

              {item && React.createElement(item, {order, item: params.item, onLink, onSave: this.handleSave})}
              {!item && <Grid columns={3} divided>
                <Grid.Row>
                  <Grid.Column>
                    <h3>General Details</h3>

                    {order && <p className="order-prices">
                      Subtotal: <strong className="order-price">{formatPrice(order.subtotal, order.currency)}</strong><br/>
                      Taxes: <strong className="order-price">{formatPrice(order.taxes, order.currency)}</strong><br/>
                      Total: <strong className="order-price">{formatPrice(order.total, order.currency)}</strong>
                    </p>}

                    {order && <p>
                      {format(order.created_at, 'MMM DD, YYYY')}
                    </p>}

                  </Grid.Column>

                  <Grid.Column>
                    <Address
                        title="Billing Details"
                        address={order && order.billing_address}
                        href={`/orders/${params.id}/billing_address`}
                        onLink={onLink}
                    />
                  </Grid.Column>

                  <Grid.Column>
                    <Address
                        title="Shipping Details"
                        address={order && order.shipping_address}
                        href={`/orders/${params.id}/shipping_address`}
                        onLink={onLink}
                    />
                  </Grid.Column>

                </Grid.Row>
              </Grid>}
            </Segment>

            <Segment loading={loading}>
              <Header as="h2" dividing>
                Line Items
                <Header.Subheader>
                  {order && formatItemTypes(order.line_items)}
                </Header.Subheader>
              </Header>

              <Table celled striped>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>
                      SKU
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      Item
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      Type
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      Qty
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      Cost
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {order && (order.line_items || []).map((item) => (
                    <Table.Row key={item.id}>
                      <Table.Cell><a href={`${config.siteURL}${item.path}`} target="_blank">{item.sku}</a></Table.Cell>
                      <Table.Cell>
                        <Header as="h4">
                          {item.title || null}
                          <Header.Subheader>
                            {item.description && <div>{item.description}</div>}
                          </Header.Subheader>
                        </Header>
                      </Table.Cell>
                      <Table.Cell>{item.type || null}</Table.Cell>
                      <Table.Cell>{item.quantity || null}</Table.Cell>
                      <Table.Cell>{formatPrice(item.price, order.currency)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Segment>
          </Grid.Column>

          <Grid.Column width={4}>
            <Segment>
              <Header as="h2">
                Customer
                <Header.Subheader>{order && order.email}</Header.Subheader>
              </Header>

              {!customer && <p>Anonymous Buyer</p>}
              {customer && <p>{customer.order_count} total orders {" "}
              <a href={`/customers/${customer.id}/orders`} onClick={onLink}>view</a></p>}

            </Segment>

            <Segment>
              <Header as="h2">
                Billing Status
                <Header.Subheader>{order && order.payment_state}</Header.Subheader>
              </Header>

              {order && <List divided>
                {order.transactions && order.transactions.map((t) => <List.Item key={t.id}>
                  <List.Header>
                    {formatPrice(t.amount, order.currency)} {formatTransactionType(t.type)}
                  </List.Header>
                  {format(t.created_at, 'MMM DD, YYYY')}

                  {t.failure_description && <Message warning>
                    <Message.Header>Transaction failed</Message.Header>
                    <p>{t.failure_description}</p>
                  </Message>}
                </List.Item>)}
              </List>}
            </Segment>

            <Segment>
              <Header as="h2">
                Shipping Status
                <Header.Subheader>Shipping to {order && order.shipping_address && order.shipping_address.country}</Header.Subheader>
              </Header>

              <Form onSubmit={this.handleShippingUpdate}>
                <Form.Group>
                  <Form.Select
                    options={[{value: "pending", text: "Pending"}, {value: "shipped", text: "shipped"}]}
                    value={newFullfilementState || order && order.fulfillment_state}
                    onChange={this.handleChangeShippingState}
                  />
                </Form.Group>
                {newFullfilementState && newFullfilementState != order.fulfillment_state && <Button type="submit">Update</Button>}
              </Form>
            </Segment>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </Layout>;
  }
}
