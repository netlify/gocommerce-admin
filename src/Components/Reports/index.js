import React, {Component} from 'react';
import addWeeks from 'date-fns/add_weeks';
import {Table} from 'semantic-ui-react';
import fx from 'money';
import Layout from '../Layout';
import ErrorMessage from '../Messages/Error';
import {formatPrice} from '../Order';

const EXCHANGE_RATE_API = 'http://api.fixer.io/latest?base=USD';

function ts(date) {
  console.log("Date is: %o", date);
  return parseInt(date.getTime() / 1000, 10);
}

function sumUSD(sales, field) {
  return (sales || []).reduce((sum, row) => {
    if (row.currency === 'USD') {
      return sum + row[field];
    }
    console.log("Converting %o from %o (%o)", row[field], row.currency, fx);
    return sum + fx.convert(row[field], {from: row.currency, to: 'USD'});
  }, 0);
}

let ratesLoaded = false;
function withRates() {
  if (ratesLoaded) {
    return Promise.resolve();
  }
  return fetch(EXCHANGE_RATE_API)
    .then((response) => response.json())
    .then((data) => {
      fx.base = data.base;
      fx.rates = data.rates;
    })
}

export default class Reports extends Component {
  constructor(props) {
    super(props);
    this.state = {loading: true, sales: null, error: null}
  }

  componentDidMount() {
    this.props.commerce.report('sales', {from: ts(addWeeks(new Date(), -1))})
      .then((report) => {
        console.log("Got report: %o", report);
        this.setState({loading: false, sales: report});
        withRates().then(() => {
          this.setState({salesTotal: {
            currency: 'USD',
            subtotal: sumUSD(report, 'subtotal'),
            taxes: sumUSD(report, 'taxes'),
            total: sumUSD(report, 'total')
          }});
        });
      })
      .catch((error) => {
        this.setState({loading: false, error});
      });
  }

  render() {
    const {onLink} = this.props;
    const {loading, error, sales, salesTotal} = this.state;

    return <Layout breadcrumb={[{label: "Reports", href: "/"}]} onLink={onLink}>
      <ErrorMessage error={error}/>

      <h2>Sales Last Week</h2>
      <Table>
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

    </Layout>;
  }
}
