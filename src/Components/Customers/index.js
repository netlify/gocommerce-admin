// @flow
import type { Commerce, Customer, Pagination } from "../../Types";
import React, { PropTypes, Component } from "react";
import {
  Breadcrumb,
  Form,
  Divider,
  Grid,
  Checkbox,
  Card,
  Segment,
  Input,
  Button, 
  Container
} from "semantic-ui-react";
import ErrorMessage from "../Messages/Error";
import Gravatar from "react-gravatar";
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import PaginationView, { pageFromURL } from "../Pagination";

const PER_PAGE = 50;

type props = {
  commerce: Commerce,
  onLink: SyntheticEvent => void
};
export default class Customers extends Component {
  props: props;
  state: {
    loading: boolean,
    error: ?Object,
    customers: ?Array<Customer>,
    pagination: ?Pagination,
    search: ?string,
    page: number
  };

  constructor(props: props) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      customers: null,
      page: pageFromURL(),
      pagination: null,
      search: null
    };
  }

  componentDidMount() {
    this.loadUsers();
  }

  handleSearchInput = (e: SyntheticEvent, el: { value: ?string }) => {
    this.setState({ search: el.value ? el.value : null });
  };

  handlePage = (e: SyntheticEvent, el: { "data-number": string }) => {
    e.preventDefault();
    this.changePage(parseInt(el["data-number"], 10));
  };

  search = (e: SyntheticEvent) => {
    e.preventDefault();
    this.loadUsers();
  };

  changePage(page: number) {
    let location = document.location.href;
    if (location.match(/page=\d+/)) {
      location = location.replace(/page=\d+/, `page=${page}`);
    } else {
      location += `${location.match(/\?/) ? "&" : "?"}page=${page}`;
    }
    this.props.push(location.replace(/https?:\/\/[^\/]+/, ""));
    this.setState({ page }, this.loadUsers);
  }

  loadUsers = () => {
    this.setState({ loading: true });
    this.props.commerce
      .users(this.userQuery())
      .then(({ users, pagination }) => {
        pagination = {
          current: this.state.page,
          last: 6,
          next: this.state.page + 1,
          total: 100
        };
        this.setState({
          loading: false,
          customers: users,
          pagination,
          error: null
        });
      })
      .catch(error => {
        console.log("Error loading customers: %o", error);
        this.setState({ loading: false, error });
      });
  };

  userQuery(page: ?number) {
    const query: Object = {
      per_page: PER_PAGE,
      page: page || this.state.page
    };
    if (this.state.search) {
      query.email = UsersFilters.email(this.state);
    }
    return query;
  }

  render() {
    const { onLink } = this.props;
    const { loading, error, customers, pagination } = this.state;

    return (
      <Container>
        <Form onSubmit={this.search}>
          <Form.Input
            action
            type="search"
            placeholder="Look up a customer..."
            className="search-input"
          >
            <Input
              icon="search"
              iconPosition="left"
              onChange={this.handleSearchInput}
            />
          </Form.Input>
        </Form>
        <ErrorMessage error={error} />
        <Segment basic>
          <Button className="export-data"/>
          <Button className="delete-data"/>
          <PaginationView
            {...pagination}
            perPage={PER_PAGE}
            onClick={this.handlePage}
          />
        </Segment>
        <Segment basic loading={loading}>
          <Card.Group itemsPerRow={3}>
            {customers &&
              customers.map(customer => (
                <Card key={customer.id}>
                  <Card.Content>
                    <Card.Header>
                      <Checkbox label="Name" />
                    </Card.Header>
                    <Card.Description>{customer.email}</Card.Description>
                  </Card.Content>
                  <Card.Content extra>
                    <p>{customer.order_count}</p>
                  </Card.Content>
                </Card>
              ))}
          </Card.Group>
        </Segment>
      </Container>
    );
  }
}

const UsersFilters = {
  email(state) {
    return state.search;
  }
};
