// @flow
import type { Config, Currency, Commerce, Order, Customer, TransactionType } from '../../Types';
import React, { PropTypes, Component } from 'react';
import ReactToPrint from "react-to-print";
import format from 'date-fns/format';
import { Button, Form, Grid, Header, List, Message, Segment, Table, Container, Modal } from 'semantic-ui-react';
import CheckboxMarkedIcon from "mdi-react/CheckboxMarkedIcon";
import CloseCircleIcon from "mdi-react/CloseCircleIcon";
import Layout from '../Layout';
import ErrorMessage from '../Messages/Error';
import Address from './Address';
import AddressEditor from './AddressEditor';
import './styles.css';

function formatId(id: string) {
  return id.split("-").pop();
}

export function formatPrice(value: number, currency: Currency) {
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

function formatTransactionType(type: TransactionType) {
  return {
    "charge": "paid",
    "refund": "refunded"
  }[type];
}

const EditableItems = {
  "shipping_address": AddressEditor,
  "billing_address": AddressEditor
};

export default class OrderView extends Component {
  props: {
    commerce: Commerce,
    params: {id: string, item: null | 'shipping_address' | 'billing_address'},
    config: Config,
    push: (string) => void,
    onLink: (SyntheticEvent) => void,
    onSave: (SyntheticEvent) => void
  };
  state: {
    loading: boolean,
    error: ?Object,
    order: ?Order,
    customer: ?Customer,
    newFullfilementState: ?string,
    modalOpen: boolean
  };
  componentRef: ?HTMLDivElement;

  constructor(props: Object) {
    super(props);
    this.state = { 
      loading: true, 
      error: null, 
      order: null, 
      customer: null, 
      newFullfilementState: null, 
      modalOpen: false
    };
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
  
  handleOpen = () => this.setState({ modalOpen: true })

  handleClose = () => this.setState({ modalOpen: false })

  handleSave = (item: 'shipping_address' | 'billing_address' | 'fulfillment_state', data: Object | string) => {
    const {commerce, push} = this.props;
    const {order} = this.state;
    if (!order) {
      return Promise.resolve();
    }

    return commerce.updateOrder(order.id, {[item]: data})
      .then((order) => {
        push(`/orders/${order.id}`);
        this.setState({loading: false, error: null, order});
      })
  };

  handleShippingUpdate = (e: SyntheticEvent) => {
    e.preventDefault();
    const {newFullfilementState} = this.state;
    if (newFullfilementState){
      this.handleSave('fulfillment_state', newFullfilementState);
    }
  }

  handleChangeShippingState = (e: SyntheticEvent, el: HTMLInputElement) => {
    this.setState({newFullfilementState: el.value});
  };

  handleReceipt = (e: SyntheticEvent) => {
    e.preventDefault();
    const {commerce, config} = this.props;
    const {order} = this.state;
    if (!order) { return; }

    const openWindow = window.open("about:blank", "Receipt");
    console.log(config.receiptTemplate)
    commerce.orderReceipt(order.id, config.receiptTemplate).then((data) => {
      openWindow.document.body.innerHTML = data.data;
    });
  }

  render() {
    const {config, params, onLink } = this.props;
    const {customer, loading, error, order, newFullfilementState} = this.state;
    const item = params.item ? EditableItems[params.item] : null;

    return <Layout
      breadcrumb={[{label: "Orders", href: "/orders"}, {label: formatId(params.id), href: `/orders/${params.id}`}]}
      onLink={onLink}
    ><Container>
      <ErrorMessage error={error}/>
        <Grid columns="equal">
          <Grid.Row className="order-col">
            <Grid.Column>
              <Segment.Group>
                <Header as='h3' attached='top'>
                  <Header.Subheader>
                      {params.id}
                      {order && <p>
                            {format(order.created_at, 'MMM DD, YYYY')} – {formatPrice(order.subtotal, order.currency)}
                      </p>}
                  </Header.Subheader>
                {order && <Header.Subheader>
                  {order.billing_address.name}
                    {customer && <p>
                    {customer.order_count} orders – {order.email}</p>}
                  </Header.Subheader>}
                </Header>
                <Segment attached loading={loading}>
                  {item && React.createElement(item, {order, item: params.item, onLink, onSave: this.handleSave})}
                  {!item && <Grid container columns={2} >
                  <Grid.Column width={6}>
                    <Grid.Column className="order-billing">
                    <Address
                        title="Billing"
                        address={order && order.billing_address}
                        href={`/orders/${params.id}/billing_address`}
                        onSave={this.handleSave}
                        item="billing_address"
                      />
                        {order && order.transactions && order.transactions.map((t) => <Header.Subheader className={order.payment_state === "paid" ? "billing-status-paid" : "billing-status"} key={t.id}>
                        {order.payment_state ==="paid"? <CheckboxMarkedIcon  size={16} color="currentColor"/> : null}
                        {order.payment_state === "paid"? "Paid on " + format(t.created_at, 'MMM DD') : order.payment_state === "pending"? "Pending" : order.payment_state}
                        {t.failure_description && <Message warning> 
                          <Message.Header>Transaction failed</Message.Header>
                            <p>{t.failure_description}</p>
                          </Message>}
                        </Header.Subheader>)}
                    </Grid.Column>
                    <Grid.Column className="order-shipping">
                    <div ref={el => (this.componentRef = el)}>
                      <Address
                        title="Shipping"
                        address={order && order.shipping_address}
                        href={`/orders/${params.id}/shipping_address`}
                        onSave={this.handleSave}
                        item="shipping_address"
                      />
                    </div>
                        {order && <Header.Subheader className={order.fulfillment_state === "shipped" ? "shipping-status-shipped" : "shipping-status"}>
                        {order.fulfillment_state === "shipped" ? <CheckboxMarkedIcon size={16} color="currentColor"/> : null}
                        {order.fulfillment_state === "shipped" ? "Shipped " : order.fulfillment_state === "pending"? "Not shipped" :  order.fulfillment_state}
                      </Header.Subheader>}
                      <br/>
                      <ReactToPrint
                        trigger={() => <Button fluid>Print shipping label</Button>}
                        content={() => this.componentRef}
                      />
                    </Grid.Column>
                  </Grid.Column>
                  <Grid.Column width={10}>
                    <Grid.Column>
                      {order && (order.line_items || []).map((item) => (
                        <Modal size="medium" className={'item-info-modal'} trigger={ 
                          <Segment onClick={this.handleOpen} className="order-item"> 
                            <p className="item-quantity">{item.quantity + "x"}</p>
                            <Header as="h4">
                              {item.title || null}
                              <Header.Subheader>
                              <p>{item.sku}</p>
                              </Header.Subheader>
                            </Header>
                            <div className="item-type">
                              <p> {item.type || null} </p>
                              <p>{formatPrice(item.price, order.currency)}</p>
                            </div>
                          </Segment>
                        }
                          open={this.state.modalOpen}
                          onClose={this.handleClose}>
                          <Modal.Header>{item.title}
                            <CloseCircleIcon onClick={this.handleClose} color="white" className="close-icon" size={24} />
                            <Segment>
                              <p>SKU:</p>
                              <p>{item.sku}</p>
                              <br/>
                              <p>Quantity:</p>
                              <p>{item.quantity}</p>
                              <br/>
                              <p>Type</p>
                              <p>{item.type}</p>
                              <br/>
                              <p>Price</p>
                              <p>{formatPrice(item.price, order.currency)}</p>
                              <br/>
                              <p>Taxes</p>
                              <p>{formatPrice(item.vat, order.currency)}</p>
                              <br/>
                              <p>Total</p>
                              <p>{formatPrice(item.price + item.vat, order.currency)}</p>
                            </Segment>  
                          </Modal.Header>
                          <Modal.Content>
                            <Segment> 
                              <p>Authors</p>
                              <p>{item.meta ? item.meta.authors : null}</p>
                              <br/>
                              <p>Product path</p>
                              <p><a href={`${config.siteURL}${item.path}`} target="_blank">{item.sku}</a></p>
                              <br/>
                              <p>Component</p>
                              <p>{item.meta ? item.meta.component : null}</p>
                            </Segment>
                          </Modal.Content>
                        </Modal>   
                      ))}
                    </Grid.Column>
                      <Grid.Column className="order-prices">
                        {order && <Segment basic>
                          <p className="price-detail"> { Math.round((order.discount / order.total) * 100) + "%"} Discount</p>
                          <p>{formatPrice(order.discount, order.currency)}</p>
                          <br/>
                          <p className="price-detail">Shipping</p>
                          <p>{formatPrice(order.shipping, order.currency)}</p>
                          <hr/>
                          <Header as="h3" >{formatPrice(order.total, order.currency)}</Header>
                          <div className="price-total">
                          Before Tax: <p>{formatPrice(order.subtotal, order.currency)}</p><br />
                          Taxes: <p>{formatPrice(order.taxes, order.currency)}</p><br />
                          Total: <p >{formatPrice(order.total, order.currency)}</p>
                          </div>
                        </Segment>}
                      </Grid.Column>
                    </Grid.Column>
                  </Grid>}
                </Segment>
              </Segment.Group>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
    </Layout>;
  }
}
