import React, {PropTypes, Component} from 'react';
import {Link} from 'react-router';
import format from 'date-fns/format';
import {Breadcrumb, Button, Divider, Grid, Header, List, Message, Segment, Table} from 'semantic-ui-react';
import ErrorMessage from '../Messages/Error';
import './styles.css';

function formatId(id) {
  return id.split("-").pop();
}

function formatAddress(field, order) {
  const addr = order[field];
  return addr && <div>
    {addr.first_name} {addr.last_name}<br/>
    {addr.company && <span>{addr.company}<br/></span>}
    {addr.address1}<br/>
    {addr.address2 && <span>{addr.address2}<br/></span>}
    {addr.city}, {addr.zip}, {addr.state && `${addr.state}, `} {addr.country}
  </div>;
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

export default class Order extends Component {
  static propTypes = {
    params: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {loading: true, error: false};
  }

  componentDidMount() {
    console.log("Props: %v", this.props);
    const {params} = this.props;
    this.props.commerce.orderDetails(params.id)
      .then((order) => {
        console.log("Loaded order: %o", order);
        this.setState({loading: false, order});
        order.user_id && this.props.commerce.userDetails(order.user_id)
          .then((customer) => this.setState({customer}));
      })
      .catch((error) => {
        console.log("Error loading order: %o", error);
        this.setState({loading: false, error});
      });
  }
  render() {
    const {config, params, onLink} = this.props;
    const {customer, loading, error, order} = this.state;
    return <div>
      <Grid>
        <Grid.Row columns={2}>
          <Grid.Column>
            <Breadcrumb>
              <Breadcrumb.Section href="/orders" onClick={onLink}>Orders</Breadcrumb.Section>
              <Breadcrumb.Divider/>
              <Breadcrumb.Section active href={`/orders/${params.id}`} onClick={onLink}>{formatId(params.id)}</Breadcrumb.Section>
            </Breadcrumb>
          </Grid.Column>
          <Grid.Column textAlign="right">

          </Grid.Column>
        </Grid.Row>
      </Grid>

      <Divider/>

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

              <Grid columns={3} divided>
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
                    <h3>
                      Billing Details
                      <Button basic compact floated="right">Edit</Button>
                    </h3>
                    {order && formatAddress("billing_address", order)}
                  </Grid.Column>

                  <Grid.Column>
                    <h3>
                      Shipping Details
                      <Button basic compact floated="right">Edit</Button>
                    </h3>

                    {order && formatAddress("shipping_address", order)}
                  </Grid.Column>

                </Grid.Row>
              </Grid>
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
              {customer && <p>{customer.order_count} total orders <Link to={`/customers/${customer.id}/orders`}>view</Link></p>}

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
                <Header.Subheader>{order && order.fulfillment_state}</Header.Subheader>
              </Header>

            </Segment>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </div>;
  }
}
