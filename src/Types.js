// @flow
export type Config = {
  siteURL: string,
  netlifyAuth: string,
  netlifySubs: string,
  netlifyCommerce: string,
  receiptTemplate: string
};

export type Currency = 'USD' | 'EUR';

export type User = {
  email: string,
  logout: () => void
};

export type Customer = {
  id: string,
  email: string,
  order_count: number,
  created_at: string,
  last_order_at: string,
  name: string
};

export type Order = {
  id: string,
  user_id: string,
  email: string,

  subtotal: number,
  taxes: number,
  total: number,
  discount: number,
  shipping_address: Address,
  billing_address: Address,

  payment_processor: 'stripe' | 'paypal',
  payment_state: 'pending' | 'paid',
  fulfillment_state: 'pending' | 'shipped',
  shipping: number,
  currency: Currency,

  vatnumber: string,

  line_items: Array<LineItem>,

  transactions: Array<Transaction>,

  selected: boolean,

  created_at: string,
  updated_at: string
};

export type LineItem = {
  id: string,
  meta: Meta,
  title: string,
  sku: string,
  path: string,

  quantity: number,
  price: number,

  type: string,

  created_at: string,
  updated_at: string,
  vat: number
};

export type TransactionType = 'charge' | 'refund';

export type Transaction = {
  id: string,
  amount: number,
  currency: Currency,
  type: TransactionType,
  created_at: string,
  failure_description: ?string
};

export type Address = {
  name:  string,
  first_name: string, last_name: string,
  company: string,
  address1: string, address2: string,
  city: string, country: string, state: string, zip: string
};

export type Meta = {
  author:  string,
  authors: string,
  component: string,
  product_path: string,
  product_sku: string
};

export type Commerce = {
  orderHistory: (Object) => Promise<{pagination: Pagination, orders: Array<Order>}>,
  orderDetails: (string) => Promise<Order>,
  orderReceipt: (string, ?string) => Promise<{data: string}>,
  updateOrder: (string, Object) => Promise<Order>,
  users: (Object) => Promise<{pagination: Pagination, users: Array<Customer>}>,
  userDetails: (string) => Promise<Customer>,
  report: (string) => Promise<any>
};

export type Pagination = {
  current: number,
  first: ?number,
  last: number,
  total: number,
  next: ?number
};
