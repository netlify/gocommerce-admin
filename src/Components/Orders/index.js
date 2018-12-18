// @flow
import type { Commerce, Pagination, Order, Address } from "../../Types";
import _ from "lodash";
import React, { Component } from "react";
import {
  Button,
  Checkbox,
  Grid,
  Dimmer,
  Dropdown,
  Loader,
  Table,
  Input,
  Select,
  Form,
  Container,
  Popup,
  Icon
} from "semantic-ui-react";
import Layout from "../Layout";
import PaginationView, { pageFromURL } from "../Pagination";
import ErrorMessage from "../Messages/Error";
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import format from "date-fns/format";
import getTime from "date-fns/get_time";
import countries from "../../data/countries.json";
import eucountries from "../../data/eucountries.js";
import "csvexport/dist/Export.min";
import "./Orders.css";

const STORED_FIELDS_KEY = "commerce.admin.orderFields.v2";
const PER_PAGE = 50;

// needed for cmd click functionality
let isCtrlKeyDown = false;
const isCtrlKey = e =>
  e.key === "Meta" || e.key === "Control" || e.metaKey || e.ctrlKey;

function formatField(label: string, order: Order) {
  return order[label.toLowerCase().replace(/ /, "_")];
}

function formatLineItems(order: Order, csv?: boolean) {
  if (csv) {
    return (
      order.line_items &&
      order.line_items
        .map(item => `${item.quantity} x ${item.title}`)
        .join(", ")
    );
  }
  return (
    order.line_items &&
    order.line_items.map(item => (
      <span key={item.id}>
        {item.quantity} x “{item.title}” <br />
      </span>
    ))
  );
}

function formatLineItemTypes(order: Order, csv: boolean) {
  let types = [];

  (order.line_items || []).map(
    item => !types.includes(item.type) && types.push(item.type)
  );

  return types.map(t => <div key={t}>{t}</div>);
}

const addressFields = [
  "name",
  "company",
  "address1",
  "address2",
  "city",
  "zip",
  "state",
  "country"
];

function formatAddress(field: "shipping_address" | "billing_address") {
  return (order: Order, csv: boolean) => {
    const addr: Address = order[field];
    if (csv) {
      return addr;
    }
    return (
      addr && (
        <div>
          {addr.first_name}
          <br />
          {addr.company && (
            <span>
              {addr.company}
              <br />
            </span>
          )}
          {addr.address1}
          <br />
          {addr.address2 && (
            <span>
              {addr.address2}
              <br />
            </span>
          )}
          {addr.city}, {addr.zip}, {addr.state && `${addr.state}, `}{" "}
          {addr.country}
        </div>
      )
    );
  };
}

function formatPriceField(field: "total" | "taxes" | "subtotal") {
  return order => {
    const currency = order.currency;
    return field === "taxes"
      ? formatTaxes(order)
      : "" + formatCurrency(order[field], currency, field);
  };
}

function formatTaxes(order: Order) {
  const percentage = Math.round((order.taxes / order.total) * 100) + "%";
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

function formatDateField(field: "created_at" | "updated_at") {
  return (order, csv) => {
    if (csv) {
      return JSON.stringify(order[field]);
    }
    return format(order[field], "MMM DD YYYY");
  };
}

const fields = {
  ID: {},
  Date: { sort: "created_at", fn: formatDateField("created_at") },
  "Updated At": { sort: "updated_at", fn: formatDateField("updated_at") },
  Items: { fn: formatLineItems },
  Type: { fn: formatLineItemTypes },
  Subtotal: { sort: "subtotal", fn: formatPriceField("subtotal") },
  Taxes: { sort: "taxes", fn: formatPriceField("taxes") },
  Total: { sort: "total", fn: formatPriceField("total") },
  Name: { fn: order => order.billing_address.name },
  Email: { sort: "email" },
  "Payment State": {},
  "Billing Address": { fn: formatAddress("billing_address") },
  "Billing Country": { fn: order => order.billing_address.country },
  "Billing Company": { fn: order => order.billing_address.company },
  "Shipping State": { fn: order => order.fulfillment_state },
  "Shipping Address": { fn: formatAddress("shipping_address") },
  "Shipping Country": { fn: order => order.shipping_address.country },
  "Shipping Company": { fn: order => order.shipping_address.company }
};

const enabledFields = {
  ID: false,
  Date: true,
  "Updated At": false,
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

let filterCount = 0;

class OrderDetail extends Component {
  props: {
    order: Order,
    enabledFields: { [key: string]: boolean },
    onLink: any => void,
    onSelect: string => void
  };

  handleClick = (e: SyntheticEvent) => {
    if (isCtrlKeyDown) {
      return window.open(`/orders/${this.props.order.id}`, "_blank");
    }
    this.props.onLink({
      preventDefault: e.preventDefault,
      target: {
        getAttribute: a => ({ href: `/orders/${this.props.order.id}` }[a])
      }
    });
  };

  handleToggle = (e: SyntheticEvent) => {
    e.preventDefault();
    this.props.onSelect(this.props.order.id);
  };

  render() {
    const { order, enabledFields } = this.props;
    return (
      <Table.Row className="tr-clickable">
        <Table.Cell key="checkbox" onClick={this.handleToggle}>
          <Checkbox checked={!!order.selected} />
        </Table.Cell>
        {Object.keys(enabledFields).map(field => {
          const tdData = fields[field].fn
            ? fields[field].fn(order)
            : formatField(field, order);
          return (
            enabledFields[field] && (
              <Table.Cell
                className={field}
                key={field}
                onClick={this.handleClick}
              >
                {field === "Items" ? (
                  <a
                    href={`/orders/${order.id}`}
                    onClick={e => e.preventDefault()}
                  >
                    {tdData}
                  </a>
                ) : (
                  tdData
                )}
              </Table.Cell>
            )
          );
        })}
      </Table.Row>
    );
  }
}

export default class Orders extends Component {
  baseFilterState: Object;
  props: {
    commerce: Commerce,
    push: string => void,
    onLink: HTMLElement => void
  };
  state: {
    loading: boolean,
    downloading: boolean,
    error: ?any,
    sortedBy: string,
    direction: "asc" | "desc",
    disabledFields: {
      disableAddressField: boolean,
      disableBillingField: boolean,
      disableShippingField: boolean,
      disableTypeField: boolean,
      disableDateField: boolean,
      disableTaxField: boolean
    },
    billingCountryType: string | null,
    filterCount: number,
    filters: {
      from: number | null,
      to: number | null,
      payment_state: string | null,
      fulfillment_state: string | null,
      item_type: string | null,
      billing_countries: Array<string>,
      email: string | null
    },
    page: number,
    enabledFields: { [key: string]: boolean },
    orders: ?Array<Order>,
    pagination: ?Pagination,
    searchScope: "email" | "item_type",
    search: ?string,
    allSelected: boolean,
    selection: boolean
  };

  constructor(props: Object) {
    super(props);
    const storedFields = localStorage.getItem(STORED_FIELDS_KEY);
    this.state = {
      direction: "asc",
      sortedBy: "created_at",
      loading: true,
      downloading: false,
      error: null,
      disabledFields: {
        disableAddressField: true,
        disableBillingField: true,
        disableShippingField: true,
        disableTypeField: true,
        disableDateField: true,
        disableTaxField: true
      },
      billingCountryType: null,
      filterCount: 0,
      filters: {
        from: null,
        to: null,
        payment_state: null,
        fulfillment_state: null,
        item_type: null,
        billing_countries: [],
        email: null
      },
      page: pageFromURL(),
      enabledFields: storedFields
        ? JSON.parse(storedFields)
        : Object.assign({}, enabledFields),
      orders: null,
      pagination: null,
      searchScope: "email",
      search: null,
      allSelected: false,
      selection: false
    };

    this.baseFilterState = { ...this.state.filters };
  }

  resetFilters = () => {
    const disabledFields = _.mapValues(this.state.disabledFields, () => true);
    this.setState({
      filters: this.baseFilterState,
      disabledFields,
      billingCountryType: null,
      filterCount: 0
    });
    this.loadOrders();
  };
  componentDidMount() {
    this.loadOrders();
    document.addEventListener(
      "keydown",
      e => isCtrlKey(e) && (isCtrlKeyDown = true)
    );
    document.addEventListener(
      "keyup",
      e => isCtrlKey(e) && (isCtrlKeyDown = false)
    );
  }

  handleToggleField = (e: SyntheticEvent, el: { name: string }) => {
    const { enabledFields } = this.state;
    const updated = Object.assign({}, enabledFields, {
      [el.name]: !enabledFields[el.name]
    });
    this.setState({ enabledFields: updated });
    localStorage.setItem(STORED_FIELDS_KEY, JSON.stringify(updated));
  };

  handleCountries = (e: SyntheticEvent, el: { value: Array<string> }) => {
    const { filters } = this.state;
    if (el.value.toString() === filters.billing_countries.toString()) {
      return;
    }
    if (el.value.length) {
      this.setState({
        filters: { ...this.state.filters, billing_countries: el.value }
      });
    } else {
        this.setState(
          {
            filters: filters.filter(f => f !== "shipping_countries")
          },
          this.loadOrders
        );
    }
  };

  handlePage = (e: SyntheticEvent, el: { "data-number": string }) => {
    e.preventDefault();
    this.changePage(parseInt(el["data-number"], 10));
  };

  handleDownload = (e: SyntheticEvent) => {
    e.preventDefault();
    const exporter = window.Export.create({ filename: "orders.csv" });
    this.setState({ downloading: true });
    this.downloadAll()
      .then(orders => {
        this.setState({ downloading: false });
        const { enabledFields } = this.state;
        const rows = orders.map(order => {
          const formattedOrder = {};
          const headers = _.flatten(
            Object.keys(enabledFields).map(field => {
              const match = field.match(/(\S+) Address$/);
              if (match) {
                return addressFields.map(field => `${match[1]} ${field}`);
              }
              return field;
            })
          );
          Object.keys(enabledFields).forEach(field => {
            if (enabledFields[field]) {
              const match = field.match(/(\S+) Address$/);
              if (match) {
                const addr = formatField(field, order);
                addressFields.forEach(field => {
                  formattedOrder[`${match[1]} ${field}`] = addr[field];
                });
              } else {
                formattedOrder[field] = fields[field].fn
                  ? fields[field].fn(order, true)
                  : formatField(field, order);
              }
            }
          });
          return formattedOrder;
        });
        exporter.downloadCsv(rows);
      })
      .catch(error => this.setState({ downloading: false, error }));
  };

  handleSearchScope = (e: SyntheticEvent, el: { value: string }) => {
    switch (el.value) {
      case "email":
        this.setState({ searchScope: "email" });
        return;
      case "item_type":
        this.setState({ searchScope: "item_type" });
        return;
      default:
        this.setState({ error: `Bad search scope: '${el.value}'` });
    }
  };

  search = (e: SyntheticEvent) => {
    const { search, searchScope, filters } = this.state;
    e.preventDefault();
    this.loadOrders();
  };

  changePage(page: number) {
    let location = document.location.href;
    if (location.match(/page=\d+/)) {
      location = location.replace(/page=\d+/, `page=${page}`);
    } else {
      location += `${location.match(/\?/) ? "&" : "?"}page=${page}`;
    }
    this.props.push(location.replace(/https?:\/\/[^\/]+/, ""));
    this.setState({ page }, this.loadOrders);
  }

  loadOrders = () => {
    this.setState({ loading: true });
    const { params, options } = this.orderQuery();
    this.props.commerce
      .orderHistory(params, options)
      .then(response => {
        const { orders, pagination } = response;
        if (pagination.last < this.state.page && this.state.page !== 1) {
          return this.changePage(1);
        }
        this.setState({ loading: false, orders, pagination, error: null });
      })
      .catch(error => {
        console.log("Error loading orders: %o", error);
        this.setState({ loading: false, error });
      });
  };

  orderQuery(page: ?number) {
    const filteredFilters = { ...this.state.filters };
    if (this.state.disabledFields.disableAddressField) {
      delete filteredFilters.shipping_address;
    }
    if (this.state.disabledFields.disableBillingField) {
      delete filteredFilters.payment_state;
    }
    if (this.state.disabledFields.disableShippingField) {
      delete filteredFilters.fulfillment_state;
    }
    if (this.state.disabledFields.disableDateField) {
      delete filteredFilters.from;
      delete filteredFilters.to;
    }
    if (!this.state.disabledFields.disableTaxField) {
      filteredFilters.tax = true;
    }
    if (this.state.searchScope === "item_type") {
      delete filteredFilters.email;
    } else {
      delete filteredFilters.item_type;
    }

    filteredFilters[this.state.searchScope] = this.state.search;
    filteredFilters.sort = `${this.state.sortedBy} ${this.state.direction}`;

  
    const params: Object = {
      user_id: "all",
      per_page: PER_PAGE,
      page: page || this.state.page,
      ..._.pickBy(filteredFilters, function(value, key) {
        if (Array.isArray(value) && value.length == 0) {
          return false;
        }
        return value;
      })
    };

    const options = {};
    if(this.state.billingCountryType === "not-eu"){
      options.negatedParams = {billing_countries: eucountries}
    }
    
    return {
      params,
      options
    };
  }

  downloadAll(page: ?number) {
    const selected = (this.state.orders || []).filter(order => order.selected);
    if (selected.length > 0) {
      return Promise.resolve(selected);
    }
    const { params, options } = this.orderQuery(page || 1);
    return this.props.commerce
      .orderHistory(params, options)
      .then(
        ({ orders, pagination }) =>
          pagination.last === pagination.current
            ? orders
            : this.downloadAll(pagination.next).then(o => orders.concat(o))
      );
  }

  searchOptions = [
    { key: "email", text: "Email", value: "email" },
    { key: "item_type", text: "Items", value: "item_type" }
  ];

  shippingOptions = [
    { key: "pending", text: "Pending", value: "pending" },
    { key: "shipped", text: "Shipped", value: "shipped" },
    { key: "failed", text: "Failed", value: "failed" }
  ];

  paymentOptions = [
    { key: "pending", text: "Pending", value: "pending" },
    { key: "paid", text: "Paid", value: "paid" },
    { key: "failed", text: "Failed", value: "failed" }
  ];

  handleSelect = (id: string) => {
    this.setState(state => {
      let selection = false;
      let orders = state.orders.map(order => {
        if (order.id === id) {
          order = { ...order, selected: !order.selected };
        }
        if (order.selected) selection = true;
        return order;
      });

      return { orders, selection };
    });
  };

  handleToDateSelection = (e: SyntheticEvent, el: { value: string }) => {
    this.setState({
      filters: { ...this.state.filters, to: getTime(el.value) / 1000 }
    });
  };

  handleFromDateSelection = (e: SyntheticEvent, el: { value: string }) => {
    this.setState({
      filters: { ...this.state.filters, from: getTime(el.value) / 1000 }
    });
  };
  handleSearchQuery = (
    e: SyntheticEvent,
    el: { value: string, name: string }
  ) => {
    this.setState({ search: el.value ? el.value : null });
  };

  handleSelections = (
    e: SyntheticEvent,
    el: { value: string, name: string }
  ) => {
    switch (el.name) {
      case "order-billing-state":
        this.setState({
          filters: { ...this.state.filters, payment_state: el.value }
        });
        break;
      case "order-shipping-state":
        this.setState({
          filters: { ...this.state.filters, fulfillment_state: el.value }
        });
        break;
      case "order-item-type":
        this.setState({
          filters: { ...this.state.filters, item_type: el.value }
        });
        break;
    }
  };

  handleCheckSelect = (
    e: SyntheticEvent,
    el: { value: string, checked: boolean }
  ) => {
    this.setState({
      disabledFields: {
        ...this.state.disabledFields,
        [el.value]: !this.state.disabledFields[el.value]
      }
    });
  };

  handleCountryChange = (e: SyntheticEvent, el: { value: string }) => {
    if (el.value === "eu") {
      this.setState({
        billingCountryType: el.value,
        filters: { ...this.state.filters, billing_countries: eucountries }
      });
    }
    this.setState({ billingCountryType: el.value });
  };

  handleToggleAll = (e: SyntheticEvent) => {
    e.preventDefault();
    const selection = !this.state.allSelected;
    this.setState({
      allSelected: selection,
      selection,
      orders: this.state.orders.map(o => ({ ...o, selected: selection }))
    });
  };

  handleReceipts = (e: SyntheticEvent) => {
    e.preventDefault();
    const { commerce } = this.props;
    const { orders } = this.state;
    const openWindow = window.open("about:blank", "Receipts");

    Promise.all(
      (orders || [])
        .filter(o => o.selected && o.payment_state === "paid")
        .map(order => commerce.orderReceipt(order.id))
    ).then(receipts => {
      openWindow.document.body.innerHTML = receipts
        .map(data => data.data)
        .join("<div class='page-break'></div>");
    });
  };

  render() {
    const { onLink } = this.props;
    const {
      loading,
      billingCountryType,
      allSelected,
      filterCount,
      filters,
      downloading,
      error,
      orders,
      pagination,
      enabledFields,
      searchScope,
      selection
    } = this.state;
    const {
      disableBillingField,
      disableShippingField,
      disableTypeField,
      disableDateField,
      disableTaxField,
      disableAddressField
    } = this.state.disabledFields;

    const { to, from } = this.state.filters;

    return (
      <Layout onLink={onLink}>
        <Container>
          <Dimmer.Dimmable dimmed={loading}>
            <ErrorMessage error={error} />
            <Dimmer active={loading}>
              <Loader active={loading}>Loading orders...</Loader>
            </Dimmer>
            <Form className="orders-search" onSubmit={this.search}>
              <Form.Input
                name={searchScope}
                action
                type="search"
                placeholder="Search..."
                className="search-input"
                onChange={this.handleSearchQuery}
              />
              <Select
                name="search-select"
                compact
                options={this.searchOptions}
                value={searchScope}
                onChange={this.handleSearchScope}
              />
              <Button type="submit">Search</Button>
            </Form>
            <Grid>
              <Grid.Row className="orders-col" columns={2}>
                <Grid.Column>
                  <Popup
                    on="click"
                    trigger={
                      <Button
                        content={
                          "Filters: " +
                          (_.countBy(Object.values(this.state.disabledFields))
                            .false || "0")
                        }
                        icon="dropdown"
                      />
                    }
                    positioning="bottom center"
                    basic
                  >
                    <Form widths="equal" onSubmit={this.search}>
                      <Form.Group>
                        <Form.Checkbox
                          checked={!disableDateField}
                          value="disableDateField"
                          name="disableDateField"
                          label="Order Date"
                          onChange={this.handleCheckSelect}
                        />
                        <Form.Input
                          name="order-date-from"
                          max={to}
                          label="from"
                          transparent
                          type="date"
                          onChange={this.handleFromDateSelection}
                          disabled={disableDateField}
                        />
                        <Form.Input
                          name="order-date-to"
                          min={from}
                          label="to"
                          transparent
                          type="date"
                          onChange={this.handleToDateSelection}
                          disabled={disableDateField}
                        />
                      </Form.Group>
                      <Form.Group>
                        <Form.Checkbox
                          label="Billing Status"
                          onChange={this.handleCheckSelect}
                          value="disableBillingField"
                          name="disableBillingField"
                          checked={!disableBillingField}
                        />
                        <Form.Select
                          name="order-billing-state"
                          placeholder="pending"
                          onChange={this.handleSelections}
                          options={this.paymentOptions}
                          disabled={disableBillingField}
                        />
                      </Form.Group>
                      <Form.Group>
                        <Form.Checkbox
                          name="disableShippingField"
                          label="Shipping Status"
                          onChange={this.handleCheckSelect}
                          value="disableShippingField"
                          checked={!disableShippingField}
                        />
                        <Form.Select
                          name="order-shipping-state"
                          placeholder="pending"
                          options={this.shippingOptions}
                          disabled={disableShippingField}
                          onChange={this.handleSelections}
                        />
                      </Form.Group>
                      <Form.Checkbox
                        checked={!disableTaxField}
                        onChange={this.handleCheckSelect}
                        value="disableTaxField"
                        name="disableTaxField"
                        label="Tax Charged"
                      />
                      <Form.Checkbox
                        name="disableAddressField"
                        value="disableAddressField"
                        checked={!disableAddressField}
                        label="Billing Address"
                        onChange={this.handleCheckSelect}
                      />
                      {!disableAddressField && (
                        <Form.Group>
                          <Form.Radio
                            checked={billingCountryType === "eu"}
                            value="eu"
                            name="Eu"
                            onChange={this.handleCountryChange}
                            label="EU"
                          />
                          <Form.Radio
                            checked={billingCountryType === "not-eu"}
                            value="not-eu"
                            name="Not Eu"
                            onChange={this.handleCountryChange}
                            label="Not EU"
                          />
                          <Form.Radio
                            checked={billingCountryType === "country"}
                            value="country"
                            name="country"
                            onChange={this.handleCountryChange}
                            label="Country"
                          />
                        </Form.Group>
                      )}
                      {billingCountryType === "country" && (
                        <Dropdown
                          selection
                          multiple={true}
                          search={true}
                          placeholder="By Country"
                          options={countries.map(country => ({
                            text: country.label,
                            value: country.label
                          }))}
                          onChange={this.handleCountries}
                        />
                      )}
                      <Button basic floated="right" type="submit">
                        Filter
                      </Button>
                    </Form>
                    <Button basic onClick={this.resetFilters} floated="right">
                      Clear Filter
                    </Button>
                  </Popup>
                </Grid.Column>
                <Grid.Column textAlign="right">
                  <Dropdown text="Columns" button>
                    <Dropdown.Menu className="orders-left-menu">
                      {Object.keys(enabledFields).map(field => (
                        <Dropdown.Item key={field}>
                          <Dropdown.Header
                            content={
                              {
                                ID: "ORDER",
                                Name: "CUSTOMER",
                                "Payment State": "BILLING",
                                "Shipping State": "SHIPPING"
                              }[field]
                            }
                          />
                          <Checkbox
                            name={field}
                            label={field}
                            checked={enabledFields[field]}
                            onChange={this.handleToggleField}
                          />
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>

                  <Button loading={downloading} onClick={this.handleDownload}>
                    Export CSV
                  </Button>

                  <Button onClick={this.handleReceipts} disabled={!selection}>
                    Open Receipts
                  </Button>
                  <PaginationView
                    {...pagination}
                    perPage={PER_PAGE}
                    onClick={this.handlePage}
                  />
                </Grid.Column>
              </Grid.Row>
            </Grid>
            <Container className="outerScroll">
              <Table celled striped selectable singleLine>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell
                      key="selector"
                      onClick={this.handleToggleAll}
                    >
                      <Checkbox checked={!!allSelected} />
                    </Table.HeaderCell>
                    {Object.keys(enabledFields).map(field => {
                      const fieldName = {
                        Date: "created_at",
                        "Updated At": "updated_at",
                        Email: "email",
                        Taxes: "taxes",
                        Subtotal: "subtotal",
                        Total: "total"
                      }[field];
                      return (
                        enabledFields[field] && (
                          <Table.HeaderCell
                            key={field}
                            onClick={() => {
                              if (!fieldName) {
                                return;
                              }
                              this.setState(
                                {
                                  sortedBy: fieldName,
                                  direction:
                                    this.state.sortedBy === fieldName &&
                                    this.state.direction === "asc"
                                      ? "desc"
                                      : "asc"
                                },
                                () => this.loadOrders()
                              );
                            }}
                          >
                            {" "}
                            {field === "Shipping State"
                              ? String.fromCodePoint(128230)
                              : field === "Payment State"
                                ? String.fromCodePoint(128181)
                                : field}
                            {this.state.sortedBy === fieldName &&
                              (this.state.direction === "asc" ? (
                                <Icon name="sort ascending" />
                              ) : (
                                <Icon name="sort descending" />
                              ))}
                          </Table.HeaderCell>
                        )
                      );
                    })}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {orders &&
                    orders.map(order => (
                      <OrderDetail
                        key={order.id}
                        order={order}
                        enabledFields={enabledFields}
                        onLink={onLink}
                        onSelect={this.handleSelect}
                      />
                    ))}
                </Table.Body>
              </Table>
            </Container>
          </Dimmer.Dimmable>
        </Container>
      </Layout>
    );
  }
}
