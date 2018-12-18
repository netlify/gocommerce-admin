// @flow
import type { Config, Commerce, Currency } from "../../Types";
import React, { Component } from "react";
import addWeeks from "date-fns/add_weeks";
import { Container, Table, Segment, Grid, List, Divider } from "semantic-ui-react";
import fx from "money";
import Layout from "../Layout";
import ErrorMessage from "../Messages/Error";
import { formatPrice } from "../Order";
import { addMonths, addDays } from "date-fns";
import { RoadIcon } from "mdi-react";

const EXCHANGE_RATE_API = "https://api.fixer.io/latest?base=USD";

type SalesRow = Array<{
  subtotal: number,
  taxes: number,
  total: number,
  currency: Currency
}>;

type SalesReport = Array<SalesRow>;

type ProductsRow = Array<{
  sku: string,
  path: string,
  total: number,
  currency: Currency
}>;

type ProductsReport = Array<ProductsRow>;

function ts(date) {
  return parseInt(date.getTime() / 1000, 10);
}

function getLastSecond(year: number, month: number) {
  return new Date(year, month + 1, 1, 0, 0, -1);
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
const makeTotals = (us: ?number, eu: ?number) => {
  let totalAmount = "0.00";

  if (us && eu) {
    totalAmount = formatPrice(us, "USD") + " + " + formatPrice(eu, "EUR");
  } else if (us) {
    totalAmount = formatPrice(us, "USD");
  } else if (eu) {
    totalAmount = formatPrice(eu, "EUR");
  }
  return totalAmount;
};

const makeSalesRows = (us: Object[], eu: Object[], key, title, orders) => {
  const usAmount = us.length > 0 ? us[0].total : undefined;
  const euAmount = eu.length > 0 ? eu[0].total : undefined;
  return (
    <Table.Row key={key}>
      <Table.Cell>{title}</Table.Cell>
      <Table.Cell>{orders ? orders : "0"} orders</Table.Cell>
      <Table.Cell>{makeTotals(usAmount, euAmount)}</Table.Cell>
    </Table.Row>
  );
};

const makeProductRows = (us: Object[], eu: Object[], product, i, config) => {
  const usAmount = us.length > 0 ? us[0].total : undefined;
  const euAmount = eu.length > 0 ? eu[0].total : undefined;
  return (
    <Table.Row key={i}>
      <Table.Cell>
        <a href={`${config.siteURL}${product[0].path}`} target="_blank">
          {product[0].sku}
        </a>
      </Table.Cell>
      <Table.Cell>{makeTotals(usAmount, euAmount)}</Table.Cell>
    </Table.Row>
  );
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
    const rotate = function<T>(arr: Array<T>, n: number): Array<T> {
      const len = arr.length;
      return arr.slice(len - n).concat(arr.slice(0, len - n));
    };

    const createDate = new Date();
    const currentMonth = createDate.getMonth();
    const currentYear = createDate.getFullYear();

    const months = [];
    for (let i = 11; i >= 0; i--) {
      months.push({
        month: i,
        year: i < currentMonth ? currentYear : currentYear-1
      })
    }

    const monthStrings = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
  
    const currentMonths = rotate(months, currentMonth);

    Promise.all([
      this.props.commerce.report("sales", {
        from: ts(addWeeks(new Date(), -1))
      }),
      this.props.commerce.report("sales", {
        from: ts(addDays(new Date(), -30))
      }),
      ...currentMonths.map(({ month, year }) => {
        return this.props.commerce.report("sales", {
          from: ts(new Date(year, month)),
          to: ts(getLastSecond(year, month))
        });
      })
    ])
      .then(reports => {
        const titles = [
          "Last 7 days",
          "last 30 days",
          ...currentMonths.map(({ month, year }) => `${monthStrings[month]} ${year}`)
        ];
        reports.forEach((report, i) => {
          report.title = titles[i] 
        });
        this.setState({ loading: false, sales: reports });
      })
      .catch(error => {
        this.setState({ loading: false, error });
      });
    this.props.commerce
      .report("products", {
        from: ts(addWeeks(new Date(), -30))
      })
      .then(reports => {
        const allReports = [];
        const reportsMap = new Map();

        for (let r of reports) {
          const dupe = reportsMap.get(r.sku);
          if (!dupe) {
            reportsMap.set(r.sku, [r]);
          } else {
            dupe.push(r);
          }
        }
        for (let [k, v] of reportsMap) {
          allReports.push(v);
        }
        this.setState({ loading: false, products: allReports });
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
        <Layout onLink={onLink}>
          <ErrorMessage error={error} />
          <Container>
          <Grid stackable centered columns={2}>
            <Grid.Column textAlign="center" width={9}>
              <Table className="left-table">
                <Table.Body>
                  {sales &&
                    sales.map((sale, i) => {
                      const orders = sale.reduce((a, b) => a + b.orders, 0);
                      const usd = sale.filter(s => s.currency === "USD");
                      const eur = sale.filter(s => s.currency === "EUR");
                      return makeSalesRows(usd, eur, i, sale.title, orders); 
                    })}
                </Table.Body>
              </Table>
            </Grid.Column>
            <Grid.Column width={6}>
              <Table className="right-table">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>
                      <span>TOP PRODUCTS: </span>
                      <span style={{ color: "#a3a8af" }}>LAST 7 DAYS</span>
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {products &&
                    products.map((product, i) => {
                      const usd = product.filter(s => s.currency === "USD");
                      const eur = product.filter(s => s.currency === "EUR");
                      return makeProductRows(usd, eur, product, i, config);
                    })}
                </Table.Body>
              </Table>
            </Grid.Column>
          </Grid>
          </Container>
        </Layout>
      </div>
    );
  }
}
