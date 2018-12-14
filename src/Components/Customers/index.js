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
  Container,
  Modal
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
    modalOpen: boolean,
    selectedCustomers: Object,
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
      modalOpen: false,
      selectedCustomers: {},
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

  handleOpen = () => this.setState({ modalOpen: true })

  handleClose = () => this.setState({ modalOpen: false })

  handleCustomerSelect = (e: SyntheticEvent, el: { value: string, checked: boolean}) =>{
    if(el.checked){
      this.setState({ selectedCustomers: {...this.state.selectedCustomers, [el.value]:true}})
    } else {
      const selected = {...this.state.selectedCustomers}
      delete selected[el.value]
      this.setState({selectedCustomers: {...selected}})
    }
  }

  deleteSelectedUsers = () => {
    this.setState({ loading: true , modalOpen: false });
    const selectedIds = Object.keys(this.state.selectedCustomers);
    this.props.commerce
      .deleteUsers(selectedIds)
      .then(({ users, pagination }) => {
        this.setState({
          loading: false,
          customers: users,
          pagination,
          error: null
        });
        this.loadUsers();
      })
      .catch(error => {
        console.log("Error deleting customers: %o", error);
        this.setState({ loading: false, error });
      });
  }

  loadUsers = () => {
    this.setState({ loading: true });
    this.props.commerce
      .users(this.userQuery())
      .then(({ users, pagination }) => {
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
            className="search-input"
          >
            <Input
              icon="search"
              iconPosition="left"
              onChange={this.handleSearchInput}
              placeholder="Look up a customer..."
            />
          </Form.Input>
        </Form>
        <ErrorMessage error={error} />
        <Segment basic>
        <Modal trigger={<Button onClick={this.handleOpen}
         className="delete">Delete Customer Data</Button>} 
         open={this.state.modalOpen}
         onClose={this.handleClose}
         size='small'>
          <Modal.Header>Delete Customer Data</Modal.Header>
            <Modal.Content>
              <p>Are you sure you want to delete this customer data?</p>
            </Modal.Content>
            <Modal.Actions>
              <Button onClick={this.handleClose} negative>No</Button>
              <Button onClick={this.deleteSelectedUsers}  positive icon='checkmark' labelPosition='right' content='Yes' />
            </Modal.Actions>
        </Modal>
          <PaginationView
            {...pagination}
            perPage={PER_PAGE}
            onClick={this.handlePage}
          />
        </Segment>
        <Segment basic loading={loading} className="customers">
          <Card.Group itemsPerRow={3}>
            {customers &&
              customers.map(customer => (
                <Card key={customer.id} className={this.state.selectedCustomers.hasOwnProperty(customer.id)? "active" : null}>
                  <Card.Content>
                    <Card.Header>
                    <Checkbox value={customer.id} onChange={this.handleCustomerSelect}></Checkbox> {customer.name?customer.name : "Anonymous Buyer"}
                    </Card.Header>
                    <Card.Description>{customer.email}</Card.Description>
                  </Card.Content>
                  <Card.Content extra>
                    <p>Last order {distanceInWordsToNow(customer.last_order_at)} ago</p>
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
