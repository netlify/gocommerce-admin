// @flow
import type {Commerce, Pagination, Order, Address} from '../../Types';
import _ from 'lodash';
import React, {Component} from 'react';
import {Button, Checkbox, Grid, Dimmer, Dropdown, Loader, Table, Icon, Header, Input, Select, Modal} from 'semantic-ui-react';
import Layout from '../Layout';
import PaginationView, {pageFromURL} from '../Pagination';
import ErrorMessage from '../Messages/Error';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import countries from '../../data/countries.json';
import 'csvexport/dist/Export.min';
import './Orders.css';
import { defaultRanges, Calendar, DateRange } from 'react-date-range'
import moment from 'moment'

import { requiresShipping, formatDateInterval } from '../../helpers'


const STORED_FIELDS_KEY = 'commerce.admin.orderFields';
const PER_PAGE = 50;

// needed for cmd click functionality
let isCtrlKeyDown = false
const isCtrlKey = e => (e.key === 'Meta' || e.key === 'Control' || e.metaKey || e.ctrlKey)

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

function formatName(order: Order, csv: boolean) {

  return _.get(order, 'billing_address.name') || _.get(order, 'shipping_address.name')
}

function formatLineItemTypes(order: Order, csv: boolean) {
  let types = [];

  (order.line_items || []).map(item => !types.includes(item.type) && types.push(item.type))

  if (csv) {
    return types.map(t => `${t}`).join(', ').replace(/,\s*$/, '')
  }

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
      {addr.name}<br/>
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
  Name: {fn: formatName},
  Type: {fn: formatLineItemTypes},
  "Shipping Address": {fn: formatAddress("shipping_address")},
  "Shipping Country": {fn: (order) => order.shipping_address.country},
  "Billing Address": {fn: formatAddress("billing_address")},
  "Billing Country": {fn: (order) => order.billing_address.country},
  Taxes: {sort: "taxes", fn: formatPriceField("taxes")},
  Subtotal: {sort: "subtotal", fn: formatPriceField("subtotal")},
  "Shipping State": {fn: (order) => requiresShipping(order) ? order.fulfillment_state : null},
  "Payment State": {},
  Total: {sort: "total", fn: formatPriceField("total")},
  "Created At": {sort: "created_at", fn: formatDateField("created_at")},
  "Updated At": {sort: "updated_at", fn: formatDateField("updated_at")}
};

const enabledFields = {
  ID: false,
  Items: true,
  Type: true,
  Name: true,
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
    onLink: (any) => void,
    onSelect: (string) => void
  };

  handleClick = (e: SyntheticEvent) => {
    if (isCtrlKeyDown) {
      return window.open(`/orders/${this.props.order.id}`, '_blank')
    }

    this.props.onLink({
      preventDefault: e.preventDefault,
      target: {getAttribute: (a) => ({href: `/orders/${this.props.order.id}`}[a])}
    });
  };

  handleToggle = (e: SyntheticEvent) => {
    e.preventDefault();
    this.props.onSelect(this.props.order.id);
  };

  render() {
    const {order, enabledFields} = this.props;
    return <Table.Row className="tr-clickable">
        <Table.Cell key="checkbox" onClick={this.handleToggle}>
          <Checkbox checked={!!order.selected}/>
        </Table.Cell>
        {Object.keys(enabledFields).map(field => {
          const tdData = fields[field].fn ? fields[field].fn(order) : formatField(field, order)

          return enabledFields[field] && (
            <Table.Cell key={field} onClick={this.handleClick}>
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
      enabledFields: Object.assign({}, enabledFields, storedFields ? JSON.parse(storedFields) : {}),
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
          console.log('Rows for orders ', order.id)
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
                console.log(addr, field, order)
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
    const { startDate, endDate } = this.state
    let query: Object = {
      user_id: "all",
      per_page: PER_PAGE,
      page: page || this.state.page
    };
    this.state.filters.forEach((filter) => {
      query[filter] = OrdersFilters[filter](this.state);
    });

    if (startDate && endDate) {
      query.from = startDate.unix()
      query.to = endDate.unix()
    }

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
    const selection = !this.state.allSelected

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

  handleDatePicker = (isReset, isApply) => this.setState({
    openDatePicker: !this.state.openDatePicker,
    startDate: !isReset ? this.state.startDate : null,
    endDate: !isReset ? this.state.endDate : null,
  }, () => (isReset || isApply) && this.loadOrders())

  render() {
    const {onLink} = this.props;
    const {loading, startDate, endDate, allSelected, openDatePicker, downloading, error, orders, pagination, tax, enabledFields, searchScope, selection} = this.state;
    const interval = formatDateInterval(startDate, endDate)


    return <Layout breadcrumb={[{label: "Orders", href: "/orders"}]} onLink={onLink}>
      <Modal open={openDatePicker}>
        <Header icon='calendar' content='Select a date range' />
        <Modal.Content>
          <DateRange
            linkedCalendars={ true }
            ranges={ defaultRanges }
            startDate={(startDate || moment()).format('DD/MM/YYYY')}
            endDate={(endDate || moment()).format('DD/MM/YYYY')}
            onInit={ ({ startDate, endDate }) => this.setState({ startDate, endDate })}
            onChange={ ({ startDate, endDate }) => this.setState({ startDate, endDate })}
            theme={{
              DateRange: { width: 850 },
              Calendar : { width: 350 },
              PredefinedRanges : { marginLeft: 10, marginTop: 10 }
            }}
          />
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => this.handleDatePicker(1)}>
            <Icon name='remove' /> Reset
          </Button>
          <Button color='green' inverted onClick={() => this.handleDatePicker(0, 1)}>
            <Icon name='checkmark' /> Apply
          </Button>
        </Modal.Actions>
      </Modal>

      <Dimmer.Dimmable dimmed={loading}>
        <ErrorMessage error={error}/>
        <Dimmer active={loading}>
            <Loader active={loading}>Loading orders...</Loader>
        </Dimmer>

        <form onSubmit={this.search}>
          <Input
            action
            type="search"
            placeholder="Search..."
            className="search-input search-padding"
            onChange={this.handleSearchInput}>
            <input />
            <Select compact options={this.searchOptions} value={searchScope} onChange={this.handleSearchScope} />
            <Button type='submit'>Search</Button>
          </Input>
        </form>
        <Grid>
          <Grid.Row columns={2}>
            <Grid.Column>

              <Button primary={!!interval} loading={downloading} onClick={() => this.handleDatePicker()}>
                {interval || 'All time'}
              </Button>



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

                <Button onClick={this.handleReceipts} disabled={!selection}>
                  Open Receipts
                </Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>

        <Table celled striped selectable>
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
        <PaginationView {...pagination} perPage={PER_PAGE} onClick={this.handlePage}/>
      </Dimmer.Dimmable>
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
