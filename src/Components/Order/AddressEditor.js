// @flow
import type {Order, Address} from '../../Types';
import React, {Component} from "react";
import ErrorMessage from '../Messages/Error';
import {Button, Form, Modal} from "semantic-ui-react";
import PencilIcon from "mdi-react/PencilIcon";
import CloseCircleIcon from "mdi-react/CloseCircleIcon";

const IconStyle = {
  float: 'right',
  cursor: 'pointer',
}

type Props = {
  order: Order,
  item: 'shipping_address' | 'billing_address',
  address: Address,
  onSave: (SyntheticEvent) => void
};

export default class AddressEditor extends Component {
  state: {
    address: ?Address,
    error: ?Object,
    loading: boolean,
    modalOpen: boolean
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      address: props.address,
      error: null,
      loading: false,
      modalOpen: false
    };
  }

  handleOpen = () => this.setState({ modalOpen: true })

  handleClose = () => this.setState({ modalOpen: false })

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.order && !this.props.order) {
      this.setState({address: Object.assign({}, nextProps.order[nextProps.item])});
    }
  }

  handleChange = (e: SyntheticEvent) => {
    if (e.target instanceof HTMLInputElement && e.target.name && e.target.value.length >=0 ){
      this.setState({address: {
        ...this.state.address,
        [e.target.name]: e.target.value
      }});
    }
  };

  handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    this.setState({loading: true})
    this.props.onSave(this.props.item, this.state.address)
    .then(()=> {
      this.handleClose();
      this.setState({loading: false})
    })
    .catch((error) => {
      console.error("Error updating order: %o");
      this.setState({error,loading: false});
    })
  };

  render() {
    const { item, order, onSave } = this.props;
    const { address, error, loading} = this.state;

    return <Modal 
      size="small"
      className="order-modal" 
      trigger={<PencilIcon style={IconStyle} onClick={this.handleOpen} className="pencil-icon" size={16} color="gray" />}
      open={this.state.modalOpen}
      onClose={this.handleClose}
    >
      <Modal.Header>
        {item ==="billing_address" ? String.fromCodePoint(128181) + " Billing Address" : item === "shipping_address" ? String.fromCodePoint(128230) + " Shipping Address": null}
        <CloseCircleIcon onClick={this.handleClose} className="close-icon" size={24} />
      </Modal.Header>
      <Modal.Content >
      <ErrorMessage error={error}/>
        <Form onSubmit={this.handleSubmit}>
          <Form.Field widths="equal">
            <Form.Input label="Name" name="name" value={address.name} onChange={this.handleChange}/>
          </Form.Field>
          <Form.Field widths="equal">
            <Form.Input label="Country" name="country" value={address.country} onChange={this.handleChange}/>
          </Form.Field>
          <Form.Group>
            <Form.Input width={10} label="City" name="state" value={address.city} onChange={this.handleChange}/>
            <Form.Input width={6} label="Postal Code" name="zip" value={address.zip} onChange={this.handleChange}/>
          </Form.Group>
          <Form.Group>
            <Form.Input width={11} label="Street Address" name="address1" value={address.address1} onChange={this.handleChange}/>
            <Form.Input width={5} label="App/Suite" name="address2" value={address.address2} onChange={this.handleChange}/>
          </Form.Group>
          <Form.Group widths="equal">
            <Form.Input label="Province/Country (optional)" name="state" value={address.state} onChange={this.handleChange}/>
          </Form.Group>
          <Form.Group widths="equal">
            <Form.Input label="Company (optional)" name="company" value={address.company} onChange={this.handleChange}/>
          </Form.Group>
          <Button loading={loading} primary type="submit">Save {item ==="billing_address" ? " Billing Address" : item ==="shipping_address" ?" Shipping Address":null} </Button>
        </Form>
      </Modal.Content>
    </Modal>
    }
}
