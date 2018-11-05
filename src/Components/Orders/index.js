// @flow
import type { Commerce, Pagination, Order, Address } from '../../Types';
import _ from 'lodash';
import React, { Component } from 'react';
import { Button, Checkbox, Grid, Dimmer, Dropdown, Loader, Table, Input, Select, Form, Container } from 'semantic-ui-react';
import Layout from '../Layout';
import PaginationView, { pageFromURL } from '../Pagination';
import ErrorMessage from '../Messages/Error';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import format from 'date-fns/format';
import countries from '../../data/countries.json';
import 'csvexport/dist/Export.min';
import './Orders.css';


const STORED_FIELDS_KEY = 'commerce.admin.orderFields.v2';
const PER_PAGE = 50;

// needed for cmd click functionality
let isCtrlKeyDown = false
const isCtrlKey = e => (e.key === 'Meta' || e.key === 'Control' || e.metaKey || e.ctrlKey)

function formatField(label: string, order: Order) {
  return order[label.toLowerCase().replace(/ /, '_')];
}

function formatLineItems(order: Order, csv?: boolean) {
  if (csv) {
    return order.line_items && order.line_items.map((item) => `${item.quantity} x ${item.title}`).join(', ');
  }
  return order.line_items && order.line_items.map((item) => <span key={item.id}>
    {item.quantity} x “{item.title}” <br/>
</span>)
}

function formatLineItemTypes(order: Order, csv: boolean) {
  let types = [];

  (order.line_items || []).map(item => !types.includes(item.type) && types.push(item.type))

  return types.map(t => <div key={t}>{t}</div>)
}

const addressFields = ['name', 'company', 'address1', 'address2', 'city', 'zip', 'state', 'country'];

function formatAddress(field: 'shipping_address' | 'billing_address') {
  return (order: Order, csv: boolean) => {
    const addr: Address = order[field];
    if (csv) {
      return addr;
    }
    return addr && <div>
      {addr.first_name}<br/>
      {addr.company && <span>{addr.company}<br/></span>}
      {addr.address1}<br/>
      {addr.address2 && <span>{addr.address2}<br/></span>}
      {addr.city}, {addr.zip}, {addr.state && `${addr.state}, `} {addr.country}
    </div>;
  };
}

function formatPriceField(field: 'total' | 'taxes' | 'subtotal') {
  return (order) => {
    const currency = order.currency;
    return field === 'taxes' ? formatTaxes(order) : '' + formatCurrency(order[field], currency, field);
  };
}

function formatTaxes(order: Order) {
  const percentage = Math.round((order.taxes / order.total) * 100) + "%"
  return `${percentage} \u2192 ${formatCurrency(order.taxes, order.currency)}`;
}

function formatCurrency(amount: number, currency: string) {
  const amountString = (amount / 100).toFixed(2);
  switch (currency) {
    case "USD":
      return `$${amountString}`;
    case "EUR":
      return `${amountString}€`;
    default:
      return `${amountString} ${currency}`;
  }
}

function formatDateField(field: 'created_at' | 'updated_at') {
  return (order, csv) => {
    if (csv) { return JSON.stringify(order[field]); }
    return format(order[field],'MMM DD YYYY')
  }
}

const fields = {
  ID: {},
  "Date": {sort: "created_at", fn: formatDateField("created_at")},
  "Updated At": {sort: "updated_at", fn: formatDateField("updated_at")},
  Items: {fn: formatLineItems},
  Type: {fn: formatLineItemTypes},
  Subtotal: {sort: "subtotal", fn: formatPriceField("subtotal")},
  Taxes: {sort: "taxes", fn: formatPriceField("taxes")},
  Total: {sort: "total", fn: formatPriceField("total")},
  Name: {fn: (order) => order.billing_address.name},
  Email: {sort: "email"},
  "Payment State": {},
  "Billing Address": {fn: formatAddress("billing_address")},
  "Billing Country": {fn: (order) => order.billing_address.country},
  "Billing Company": {fn: (order) => order.billing_address.company},
  "Shipping State": {fn: (order) => order.fulfillment_state},
  "Shipping Address": {fn: formatAddress("shipping_address")},
  "Shipping Country": {fn: (order) => order.shipping_address.country},
  "Shipping Company": {fn: (order) => order.shipping_address.company}
};

const enabledFields = {
  ID: false,
  "Date": true,
  "Updated At":false,
  Items: true,
  Type: true,
  Subtotal: false,
  Taxes: false,
  Total: true,
  Name: false,
  Email: true,
  "Payment State": true,
  "Billing Address": false,
  "Billing Country": false,
  "Billing Company": false,
  "Shipping State": true,
  "Shipping Address": false,
  "Shipping Country": false,
  "Shipping Company": false
};

class OrderDetail extends Component {
  props: {
    order: Order,
    enabledFields: {[key: string]: boolean },
    onLink: (any) => void,
    onSelect: (string) => void
  };
  
  handleClick = (e: SyntheticEvent) => {
    if (isCtrlKeyDown) {
      return window.open(`/orders/${this.props.order.id}`, '_blank')
    }
    this.props.onLink({
      preventDefault: e.preventDefault,
      target: { getAttribute: (a) => ({ href: `/orders/${this.props.order.id}` }[a]) }
    });
  };

  handleToggle = (e: SyntheticEvent) => {
    e.preventDefault();
    this.props.onSelect(this.props.order.id);
  };

  render() {
    const { order, enabledFields } = this.props;
    return <Table.Row className="tr-clickable">
      <Table.Cell key="checkbox" onClick={this.handleToggle}>
        <Checkbox checked={!!order.selected} />
      </Table.Cell>
      {Object.keys(enabledFields).map(field => {
        const tdData = fields[field].fn ? fields[field].fn(order) : formatField(field, order)
        return enabledFields[field] && (
          <Table.Cell className={field} key={field} onClick={this.handleClick}>
            {field === 'Items' ? <a href={`/orders/${order.id}`} onClick={e => e.preventDefault()}>{tdData}</a> : tdData}
          </Table.Cell>
        )
      })}
    </Table.Row>;
  }
}

export default class Orders extends Component {
  props: {
    commerce: Commerce,
    push: (string) => void,
    onLink: (HTMLElement) => void
  };
  state: {
    loading: boolean,
    downloading: boolean,
    error: ?any,
    filters: Array<'tax' | 'shipping_countries' | 'email' | 'items'>,
    page: number,
    enabledFields: {[key: string]: boolean},
    tax: boolean,
    shippingCountries: ?Array<string>,
    orders: ?Array<Order>,
    pagination: ?Pagination,
    searchScope: 'email' | 'items',
    search: ?string,
    selection: boolean
  };

  constructor(props: Object) {
    super(props);
    const storedFields = localStorage.getItem(STORED_FIELDS_KEY);
    this.state = {
      loading: true,
      downloading: false,
      error: null,
      filters: [],
      page: pageFromURL(),
      enabledFields: storedFields ? JSON.parse(storedFields) : Object.assign({}, enabledFields),
      tax: false,
      shippingCountries: null,
      orders: null,
      pagination: null,
      searchScope: 'email',
      search: null,
      selection: false
    };
  }

  componentDidMount() {
    this.loadOrders();
    document.addEventListener('keydown', e => isCtrlKey(e) && (isCtrlKeyDown = true))
    document.addEventListener('keyup', e => isCtrlKey(e) && (isCtrlKeyDown = false))
  }

  handleToggleField = (e: SyntheticEvent, el: {name: string}) => {
    const {enabledFields} = this.state;
    const updated = Object.assign({}, enabledFields, {[el.name]: !enabledFields[el.name]});
    this.setState({enabledFields: updated});
    localStorage.setItem(STORED_FIELDS_KEY, JSON.stringify(updated));
  };

  handleTax = (e: SyntheticEvent) => {
    e.preventDefault();
    const {tax, filters} = this.state;
    if (tax) {
      this.setState({tax: false, filters: filters.filter(f => f !== 'tax')}, this.loadOrders);
    } else {
      this.setState({tax: true, filters: filters.concat(['tax'])}, this.loadOrders);
    }
  };

  handleCountries = (e: SyntheticEvent, el: {value: Array<string>}) => {
    const {shippingCountries, filters} = this.state;
    if (JSON.stringify(el.value) === JSON.stringify(shippingCountries)) {
      return;
    }

    if (el.value.length) {
      this.setState({shippingCountries: el.value, filters: filters.concat(['shipping_countries'])}, this.loadOrders);
    } else {
      this.setState({shippingCountries: [], filters: filters.filter(f => f !== 'shipping_countries')}, this.loadOrders);
    }
  };

  handlePage = (e: SyntheticEvent, el: {'data-number': string}) => {
    e.preventDefault();
    this.changePage(parseInt(el['data-number'], 10));
  };

  handleDownload = (e: SyntheticEvent) => {
    e.preventDefault();
    const exporter = window.Export.create({filename: 'orders.csv'});
    this.setState({downloading: true});
    this.downloadAll()
      .then((orders) => {
        this.setState({downloading: false});
        const {enabledFields} = this.state;
        const rows = orders.map((order) => {
          const formattedOrder = {};
          const headers = _.flatten(Object.keys(enabledFields).map((field) => {
            const match = field.match(/(\S+) Address$/);
            if (match) {
              return addressFields.map((field) => `${match[1]} ${field}`);
            }
            return field;
          }))
          Object.keys(enabledFields).forEach((field) => {
            if (enabledFields[field]) {
              const match = field.match(/(\S+) Address$/);
              if (match) {
                const addr = formatField(field, order);
                addressFields.forEach((field) => {
                  formattedOrder[`${match[1]} ${field}`] = addr[field];
                })
              } else {
                formattedOrder[field] = fields[field].fn ? fields[field].fn(order, true) : formatField(field, order);
              }
            }
          });
          return formattedOrder;
        });
        exporter.downloadCsv(rows);
      })
      .catch((error) => this.setState({downloading: false, error}));
  };

  handleSearchInput = (e: SyntheticEvent, el: {value: ?string}) => {
    this.setState({search: el.value ? el.value : null});
  };

  handleSearchScope = (e: SyntheticEvent, el: {value: string}) => {
    switch (el.value) {
      case 'email':
        this.setState({searchScope: 'email'});
        return;
      case 'items':
        this.setState({searchScope: 'items'});
        return;
      default:
        this.setState({error: `Bad search scope: '${el.value}'`});
    }
  };

  search = (e: SyntheticEvent) => {
    const {search, searchScope, filters} = this.state;

    e.preventDefault();

    let newFilters = filters.slice();
    let filtersToRemove = this.searchOptions.map(opt => opt.value)

    if (search) {
      if (!newFilters.includes(searchScope)) newFilters.push(searchScope);
      filtersToRemove = filtersToRemove.filter(val => val !== searchScope);
    }

    // Remove any non-active search filters
    newFilters = newFilters.filter(f => !filtersToRemove.some(ftr => f === ftr));

    this.setState({filters: newFilters}, this.loadOrders);
  };

  changePage(page: number) {
    let location = document.location.href;
    if (location.match(/page=\d+/)) {
      location = location.replace(/page=\d+/, `page=${page}`)
    } else {
      location += `${location.match(/\?/) ? '&' : '?'}page=${page}`;
    }
    this.props.push(location.replace(/https?:\/\/[^\/]+/, ''));
    this.setState({page}, this.loadOrders);
  }

  loadOrders = () => {
    this.setState({loading: true});
    this.props.commerce.orderHistory(this.orderQuery())
      .then((response) => {
        const {orders, pagination} = response;
        console.log(pagination, 'test')
        if (pagination.last < this.state.page && this.state.page !== 1) {
          return this.changePage(1);
        }
        this.setState({loading: false, orders, pagination, error: null});
      })
      .catch((error) => {
        console.log("Error loading orders: %o", error);
        this.setState({loading: false, error});
      });
  }

  orderQuery(page: ?number) {
    const query: Object = {
      user_id: "all",
      per_page: PER_PAGE,
      page: page || this.state.page
    };
    this.state.filters.forEach((filter) => {
      query[filter] = OrdersFilters[filter](this.state);
    });
    return query;
  }

  downloadAll(page: ?number) {
    const selected = (this.state.orders || []).filter((order) => order.selected);
    if (selected.length > 0) {
      return Promise.resolve(selected);
    }

    return this.props.commerce.orderHistory(this.orderQuery(page || 1))
      .then(({orders, pagination}) => (
        pagination.last === pagination.current ? orders : this.downloadAll(pagination.next).then(o => orders.concat(o))
      ));
  };

  searchOptions = [
    { key: 'email', text: 'Email', value: 'email' },
    { key: 'items', text: 'Items', value: 'items' },
  ]

  handleSelect = (id: string) => {
    this.setState((state) => {
      let selection = false;

      let orders = state.orders.map((order) => {
        if (order.id === id) {
          order = {...order, selected: !order.selected};
        }
        if (order.selected) selection = true
        return order
      });

      return {orders, selection};
    });
  }

  handleToggleAll = e => {
    e.preventDefault()
    const selection = !this.state.allSelected;
    this.setState({
      allSelected: selection,
      selection,
      orders: this.state.orders.map(o => ({ ...o, selected: selection }))
    })
  }

  handleReceipts = (e: SyntheticEvent) => {
    e.preventDefault();
    const {commerce} = this.props;
    const {orders} = this.state;
    const openWindow = window.open("about:blank", "Receipts");

    Promise.all((orders || []).filter((o) => o.selected && o.payment_state === 'paid').map((order) => commerce.orderReceipt(order.id)))
      .then((receipts) => {
        openWindow.document.body.innerHTML = receipts.map((data) => data.data).join("<div class='page-break'></div>");
      });
  }

  render() {
    const {onLink} = this.props;
    const {loading, allSelected, downloading, error, orders, pagination, tax, enabledFields, searchScope, selection} = this.state;

    return <Layout onLink={onLink}>
    <Container>
      <Dimmer.Dimmable dimmed={loading}>
        <ErrorMessage error={error}/>
        <Dimmer active={loading}>
            <Loader active={loading}>Loading orders...</Loader>
        </Dimmer>

        <Form className="orders-search" onSubmit={this.search}>
          <Form.Input
            action
            type="search"
            placeholder="Search..."
            className="search-input"
            onChange={this.handleSearchInput}/>
            <Select compact options={this.searchOptions} value={searchScope} onChange={this.handleSearchScope} />
            <Button type='submit'>Search</Button>
        </Form>
        <Grid>
          <Grid.Row className="orders-col" columns={2}>
            <Grid.Column>
              <Button toggle active={tax} onClick={this.handleTax}>
                Includes Tax
              </Button>

              <Dropdown
                selection
                multiple={true}
                search={true}
                placeholder='By Country'
                options={countries.map(country => ({text: country.label, value: country.label}))}
                onChange={this.handleCountries}
              />
            </Grid.Column>
            <Grid.Column textAlign="right">
                <Dropdown text="Columns" button>
                  <Dropdown.Menu className="orders-left-menu">
                    {Object.keys(enabledFields).map((field) => <Dropdown.Item key={field}>
                      <Dropdown.Header 
                        content={{
                          "ID": "ORDER",
                          "Name": "CUSTOMER",
                          "Payment State": "BILLING",
                          "Shipping State": "SHIPPING"
                        }[field]} 
                      />
                      <Checkbox name={field} label={field} checked={enabledFields[field]} onChange={this.handleToggleField}/>
                    </Dropdown.Item>)}
                  </Dropdown.Menu>
                </Dropdown>
                
                <Button loading={downloading} onClick={this.handleDownload}>
                  Export CSV
                </Button>

                <Button onClick={this.handleReceipts} disabled={!selection}>
                  Open Receipts
                </Button>
                <PaginationView {...pagination} perPage={PER_PAGE} onClick={this.handlePage}/>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Container className="outerScroll">
          <Table celled striped selectable singleLine>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell key="selector" onClick={this.handleToggleAll}>
                  <Checkbox checked={!!allSelected} />
                </Table.HeaderCell>
                {Object.keys(enabledFields).map((field) => enabledFields[field] && <Table.HeaderCell key={field}>
                  {field}
                </Table.HeaderCell>)}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orders && orders.map((order) => (
                <OrderDetail key={order.id} order={order} enabledFields={enabledFields} onLink={onLink} onSelect={this.handleSelect}/>
              ))}
            </Table.Body>
          </Table>
        </Container>
      </Dimmer.Dimmable>
    </Container>
    </Layout>;
  }
}

const OrdersFilters = {
  tax(state) {
    return true;
  },
  shipping_countries(state) {
    return state.shippingCountries && state.shippingCountries.join(',');
  },
  email(state) {
    return state.search
  },
  items(state) {
    return state.search
  }
};
