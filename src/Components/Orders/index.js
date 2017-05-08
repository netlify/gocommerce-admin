// @flow
import type {Commerce, Pagination, Order, Address} from '../../Types';
import React, {Component} from 'react';
import {Button, Checkbox, Grid, Dimmer, Dropdown, Loader, Table, Input, Select} from 'semantic-ui-react';
import Layout from '../Layout';
import PaginationView, {pageFromURL} from '../Pagination';
import ErrorMessage from '../Messages/Error';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import countries from '../../data/countries.json';
import 'csvexport/dist/Export.min';
import './Orders.css';


const STORED_FIELDS_KEY = 'commerce.admin.orderFields';
const PER_PAGE = 50;

function formatField(label: string, order: Order) {
  return order[label.toLowerCase().replace(/ /, '_')];
}

function formatLineItems(order: Order, csv: boolean) {
  if (csv) {
    return order.line_items && order.line_items.map((item) => `${item.quantity} x ${item.title}`).join(', ');
  }
  return order.line_items && order.line_items.map((item) => <span key={item.id}>
    {item.quantity} x “{item.title}” <br/>
</span>)
}

function formatAddress(field: 'shipping_address' | 'billing_address') {
  return (order: Order, csv: boolean) => {
    const addr: Address = order[field];
    if (csv) {
      return [
        `${addr.first_name} ${addr.last_name}`,
        addr.company, addr.address1, addr.address2,
        addr.city, addr.zip, addr.state, addr.country
      ].filter(f => f).join(',');
    }
    return addr && <div>
      {addr.first_name} {addr.last_name}<br/>
      {addr.company && <span>{addr.company}<br/></span>}
      {addr.address1}<br/>
      {addr.address2 && <span>{addr.address2}<br/></span>}
      {addr.city}, {addr.zip}, {addr.state && `${addr.state}, `} {addr.country}
    </div>;
  };
}

function formatPriceField(field: 'total' | 'taxes' | 'subtotal') {
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

function formatDateField(field: 'created_at' | 'updated_at') {
  return (order, csv) => {
    if (csv) { return JSON.stringify(order[field]); }
    return distanceInWordsToNow(order[field]) + " ago";
  }
}

const fields = {
  ID: {},
  Email: {sort: "email"},
  Items: {fn: formatLineItems},
  "Shipping Address": {fn: formatAddress("shipping_address")},
  "Shipping Country": {fn: (order) => order.shipping_address.country},
  "Billing Address": {fn: formatAddress("billing_address")},
  "Billing Country": {fn: (order) => order.billing_address.country},
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
  "Shipping Country": false,
  "Billing Address": false,
  "Billing Country": false,
  "Shipping State": true,
  "Payment State": true,
  Taxes: false,
  Subtotal: false,
  Total: true,
  "Created At": true,
  "Updated At":false
};

class OrderDetail extends Component {
  props: {
    order: Order,
    enabledFields: {[key: string]: boolean },
    onLink: (any) => void
  };

  handleClick = (e: SyntheticEvent) => {
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
  props: {
    commerce: Commerce,
    push: (string) => void,
    onLink: (HTMLElement) => void
  };
  state: {
    loading: boolean,
    downloading: boolean,
    error: ?any,
    filters: Array<'tax' | 'shipping_countries'>,
    page: number,
    enabledFields: {[key: string]: boolean},
    tax: boolean,
    shippingCountries: ?Array<string>,
    orders: ?Array<Order>,
    pagination: ?Pagination,
    searchScope: string,
    search: ?string
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
      search: null
    };
  }

  componentDidMount() {
    this.loadOrders();
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
          Object.keys(enabledFields).forEach((field) => {
            if (enabledFields[field]) {
              formattedOrder[field] = fields[field].fn ? fields[field].fn(order, true) : formatField(field, order);
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

  handleSearchScope = (e: SyntheticEvent, el: {value: ?string}) => {
    this.setState({searchScope: el.value})
  }

  search = (e: SyntheticEvent) => {
    const {search, searchScope, filters} = this.state;
    let newFilters = filters.slice();
    let filtersToRemove = this.searchOptions.map(opt => opt.value)

    if (search) {
      if (!newFilters.includes(searchScope)) newFilters.push(searchScope)
      filtersToRemove = filtersToRemove.filter(val => val !== searchScope)
    }

    // Remove any non-active search filters
    newFilters = newFilters.filter(f => !filtersToRemove.some(ftr => f === ftr))

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
        if (pagination.last < this.state.page) {
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
    console.log(query)
    return query;
  }

  downloadAll(page: ?number) {
    return this.props.commerce.orderHistory(this.orderQuery(page || 1))
      .then(({orders, pagination}) => (
        pagination.last === pagination.current ? orders : this.downloadAll(pagination.next).then(o => orders.concat(o))
      ));
  };

  searchOptions = [
    { key: 'email', text: 'Email', value: 'email' },
    { key: 'items', text: 'Items', value: 'items' },
  ]

  render() {
    const {onLink} = this.props;
    const {loading, downloading, error, orders, pagination, tax, enabledFields, searchScope} = this.state;

    return <Layout breadcrumb={[{label: "Orders", href: "/orders"}]} onLink={onLink}>
      <Dimmer.Dimmable dimmed={loading}>
        <ErrorMessage error={error}/>
        <Dimmer active={loading}>
            <Loader active={loading}>Loading orders...</Loader>
        </Dimmer>

        <Input
          action
          type="search"
          placeholder="Search..."
          className="search-input search-padding"
          onChange={this.handleSearchInput}>
          <input />
          <Select compact options={this.searchOptions} value={searchScope} onChange={this.handleSearchScope} />
          <Button type='submit' onClick={this.search}>Search</Button>
        </Input>
        <Grid>
          <Grid.Row columns={2}>
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
                <Dropdown text="Fields" button>
                  <Dropdown.Menu className="orders-left-menu">
                    {Object.keys(enabledFields).map((field) => <Dropdown.Item key={field}>
                      <Checkbox name={field} label={field} checked={enabledFields[field]} onChange={this.handleToggleField}/>
                    </Dropdown.Item>)}
                  </Dropdown.Menu>
                </Dropdown>

                <Button loading={downloading} onClick={this.handleDownload}>
                  Export CSV
                </Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>

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
              <OrderDetail key={order.id} order={order} enabledFields={enabledFields} onLink={onLink}/>
            ))}
          </Table.Body>
        </Table>
        <PaginationView {...pagination} perPage={PER_PAGE} onClick={this.handlePage}/>
      </Dimmer.Dimmable>
    </Layout>;
  }
}

const OrdersFilters = {
  tax() {
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
