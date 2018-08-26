// @flow
import type { Config, Commerce, Currency } from "../../Types";
import React, { Component } from "react";
import addWeeks from "date-fns/add_weeks";
import { Table, Segment, Grid, List, Divider } from "semantic-ui-react";
import fx from "money";
import Layout from "../Layout";
import ErrorMessage from "../Messages/Error";
import { formatPrice } from "../Order";
import { addMonths, addDays } from "date-fns";
import { RoadIcon } from "mdi-react";

const EXCHANGE_RATE_API = "https://api.fixer.io/latest?base=USD";

type SalesRow = {
  subtotal: number,
  taxes: number,
  total: number,
  currency: Currency
};
type SalesReport = Array<SalesRow>;
type ProductsRow = {
  sku: string,
  path: string,
  total: number,
  currency: Currency
};
type ProductsReport = Array<ProductsRow>;

function ts(date) {
  return parseInt(date.getTime() / 1000, 10);
}

function getLastSecond(month) {
  return new Date(2018, month + 1, 1, 0, 0, -1);
}

function sumUSD(sales, field) {
  return (sales || []).reduce((sum, row) => {
    if (row.currency === "USD") {
      return sum + row[field];
    }
    return sum + fx.convert(row[field], { from: row.currency, to: "USD" });
  }, 0);
}

let ratesLoaded = false;
function withRates() {
  if (ratesLoaded) {
    return Promise.resolve();
  }
  return fetch(EXCHANGE_RATE_API)
    .then(response => response.json())
    .then(data => {
      fx.base = data.base;
      fx.rates = data.rates;
    });
}

const makeSalesRows = (us: Object[], eu, key, title, orders ) => {
  if (us.length > 0 && eu.length > 0) {
    return (
      <Table.Row key={key}>
        <Table.Cell>{title}</Table.Cell>
        <Table.Cell>{orders}</Table.Cell>
        <Table.Cell>{us[0].total + "$" + " + " + "€"  + eu[0].total}</Table.Cell>
      </Table.Row>
    );
  } else if (us.length > 0) {
    return (
      <Table.Row key={key}>
        <Table.Cell>{title}</Table.Cell>
        <Table.Cell>{orders}</Table.Cell>
        <Table.Cell>{us[0].total + " $"}</Table.Cell>
      </Table.Row>
    );
  } else if (eu.length > 0) {
    return (
      <Table.Row key={key}>
        <Table.Cell>{title}</Table.Cell>
        <Table.Cell>{orders}</Table.Cell>
        <Table.Cell>{eu[0].total + " €"}</Table.Cell>
      </Table.Row>
    );
  }
};

const makeProductsRows = (us: Object[], eu, key, title, orders ) => {
  if (us.length > 0 && eu.length > 0) {
    return (
      <Table.Row key={key}>
        <Table.Cell>{title}</Table.Cell>
        <Table.Cell>{orders}</Table.Cell>
        <Table.Cell>{us[0].total + "$" + " + " + "€"  + eu[0].total}</Table.Cell>
      </Table.Row>
    );
  } else if (us.length > 0) {
    return (
      <Table.Row key={key}>
        <Table.Cell>{title}</Table.Cell>
        <Table.Cell>{orders}</Table.Cell>
        <Table.Cell>{us[0].total + " $"}</Table.Cell>
      </Table.Row>
    );
  } else if (eu.length > 0) {
    return (
      <Table.Row key={key}>
        <Table.Cell>{title}</Table.Cell>
        <Table.Cell>{orders}</Table.Cell>
        <Table.Cell>{eu[0].total + " €"}</Table.Cell>
      </Table.Row>
    );
  }
};

type props = {
  config: Config,
  commerce: Commerce,
  onLink: SyntheticEvent => void
};

export default class Reports extends Component {
  props: props;
  state: {
    loading: boolean,
    error: ?Object,
    sales: ?SalesReport,
    salesTotal: ?SalesRow,
    products: ?ProductsReport
  };

  constructor(props: props) {
    super(props);
    this.state = {
      loading: true,
      sales: null,
      products: null,
      error: null,
      salesTotal: null
    };
  }

  componentDidMount() {
    // last 7 days
    // last 30 days
    // for each month in the last twelve months
    //most recent 12 monts
    const rotate = function(arr, n) {
      const len = arr.length;
      return arr.slice(len - n).concat(arr.slice(0, len - n));
    };

    const createDate = new Date();
    const currentMonth = createDate.getMonth();
    const currentYear = createDate.getFullYear();
    const months = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 2, 0];
    const currentMonths = rotate(months, currentMonth - 1);

    Promise.all([
      this.props.commerce.report("sales", {
        from: ts(addWeeks(new Date(), -1))
      }),
      this.props.commerce.report("sales", {
        from: ts(addDays(new Date(), -30))
      }),
      ...currentMonths.map(month => {
        return this.props.commerce.report("sales", {
          from: ts(new Date(currentYear, month)),
          to: ts(getLastSecond(month))
        });
      })
    ])
      .then(reports => {
        const titles = [
          "Last 7 days",
          "last 30 days",
          ...rotate([
          "December",
          "November",
          "October",
          "September",
          "August",
          "July",
          "June",
          "May",
          "April",
          "March",
          "February",
          "January"
        ], currentMonth - 1)];
        //attach the title/months to each reports object
        reports.forEach((report, i) => {
          report.title = titles[i];
        })
        this.setState({ loading: false, sales: reports });
      })
      .catch(error => {
        this.setState({ loading: false, error });
      });
    Promise.all([
        this.props.commerce.report("products", {
          from: ts(addWeeks(new Date(), -1))
        }),
        this.props.commerce.report("products", {
          from: ts(addDays(new Date(), -30))
        }),
        ...currentMonths.map(month => {
          return this.props.commerce.report("products", {
            from: ts(new Date(currentYear, month)),
            to: ts(getLastSecond(month))
          });
        })
    ])
      .then(report => {
        console.log(report)
        this.setState({ loading: false, products: report });
      })
      .catch(error => {
        this.setState({ loading: false, error });
      });
  }

  render() {
    const { config, onLink } = this.props;
    const { loading, error, sales, salesTotal, products } = this.state;

    return (
      <div>
        <Layout breadcrumb={[{ label: "Reports", href: "/" }]} onLink={onLink}>
          <ErrorMessage error={error} />
          <Grid stackable container columns={2}>
            <Grid.Column textAlign="center" floated="left" width={7}>
              <Table>
                <Table.Header className="left-header">
                  <Table.Row>
                    <Table.HeaderCell>Last 7 Days</Table.HeaderCell>
                    <Table.HeaderCell>Approved</Table.HeaderCell>
                    <Table.HeaderCell>sales</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body className="left-body">
                  {sales &&
                    sales.map((sale, i) => {
                      const usd = sale.filter(s => s.currency === "USD");
                      const eur = sale.filter(s => s.currency === "EUR");
                      return makeSalesRows(usd,eur,i, sale.title, "test")
                    })}
                </Table.Body>
              </Table>
            </Grid.Column>
            <Grid.Column floated="right" width={6}>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>
                      Top Products: Last 7 Days
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Divider />
                <Table.Body>
                  <Table.Row>
                    <Table.Cell>smashing-book-6</Table.Cell>
                    <Table.Cell>Cost</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </Grid.Column>
          </Grid>
          {/* <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Currency</Table.HeaderCell>
            <Table.HeaderCell>SubTotal</Table.HeaderCell>
            <Table.HeaderCell>Taxes</Table.HeaderCell>
            <Table.HeaderCell>Total</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sales && sales.map((row, i) => <Table.Row key={i}>
            <Table.Cell>{row.currency}</Table.Cell>
            <Table.Cell>{formatPrice(row.subtotal, row.currency)}</Table.Cell>
            <Table.Cell>{formatPrice(row.taxes, row.currency)}</Table.Cell>
            <Table.Cell>{formatPrice(row.total, row.currency)}</Table.Cell>
          </Table.Row>)}
        </Table.Body>
        <Table.Footer>
          {salesTotal &&<Table.Row>
            <Table.HeaderCell>Estimated Total in {salesTotal.currency}</Table.HeaderCell>
            <Table.HeaderCell>{formatPrice(salesTotal.subtotal, salesTotal.currency)}</Table.HeaderCell>
            <Table.HeaderCell>{formatPrice(salesTotal.taxes, salesTotal.currency)}</Table.HeaderCell>
            <Table.HeaderCell>{formatPrice(salesTotal.total, salesTotal.currency)}</Table.HeaderCell>
          </Table.Row>}
        </Table.Footer>
      </Table>

      <h2>Top Products Last Week</h2>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Product</Table.HeaderCell>
            <Table.HeaderCell>Amount Sold</Table.HeaderCell>
            <Table.HeaderCell>Currency</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {products && products.map((row, i) => <Table.Row key={i}>
            <Table.Cell><a href={`${config.siteURL}${row.path}`} target="_blank">{row.sku}</a></Table.Cell>
            <Table.Cell>{formatPrice(row.total, row.currency)}</Table.Cell>
            <Table.Cell>{row.currency}</Table.Cell>
          </Table.Row>)}
        </Table.Body>
      </Table> */}
        </Layout>
      </div>
    );
  }
}
