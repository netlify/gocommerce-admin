// @flow
import type {Commerce, Customer, Pagination} from '../../Types';
import React, {PropTypes, Component} from 'react';
import {Breadcrumb, Divider, Grid, Item, Segment, Input} from 'semantic-ui-react';
import ErrorMessage from '../Messages/Error';
import Gravatar from 'react-gravatar';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';

type props = {
  commerce: Commerce,
  onLink: (SyntheticEvent) => void
};
export default class Customers extends Component {
  props: props;
  state: {
    loading: boolean,
    error: ?Object,
    customers: ?Array<Customer>,
    pagination: ?Pagination
  };

  constructor(props: props) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      customers: null,
      pagination: null
    };
  }

  componentDidMount() {
    this.props.commerce.users({page: 1})
      .then(({users, pagination}) => {
        this.setState({loading: false, customers: users, pagination, error: null});
      })
      .catch((error) => {
        console.log("Error loading customers: %o", error);
        this.setState({loading: false, error});
      });
  }

  render() {
    const {onLink} = this.props;
    const {loading, error, customers} = this.state;

    return <div>
      <Grid>
        <Grid.Row columns={2}>
          <Grid.Column>
            <Breadcrumb>
              <Breadcrumb.Section active href="/customers" onClick={onLink}>Customers</Breadcrumb.Section>
            </Breadcrumb>
          </Grid.Column>
          <Grid.Column textAlign="right">

          </Grid.Column>
        </Grid.Row>
      </Grid>

      <Divider/>

      <Input type="search" action="Search" placeholder="Search..." className="search-input" name="search"/>
      <ErrorMessage error={error}/>

      <Segment loading={loading}>
        <Item.Group divided>
          {customers && customers.map((customer) => <Item key={customer.id}>
            <div className="ui tiny image">
              <Gravatar email={customer.email}/>
            </div>
            <Item.Content>
              <Item.Header>{customer.email}</Item.Header>
              <Item.Description>{customer.order_count} Orders</Item.Description>
              <Item.Extra>Created {distanceInWordsToNow(customer.created_at)} ago</Item.Extra>
            </Item.Content>
          </Item>)}
        </Item.Group>
      </Segment>
    </div>;
  }
}
