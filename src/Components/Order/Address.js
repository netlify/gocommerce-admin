// @flow
import type {Address} from '../../Types';
import React from "react";
import AddressEditor from './AddressEditor';

type args = {
  title: string,
  address: ?Address,
  href: string,
  onSave: any,
  item: 'shipping_address' | 'billing_address'
}

const IconStyle = {
  padding: '5px',
  boxShadow: 'none'
}

const H3Style = {
  color: '#2a4872',
  fontSize: '13px'
}
const Hr = {
  border: 'none',
  height: '2px',
  color: '#2a4872',
  backgroundColor: '#2a4872'
}
export default function ({ title, address, href, onSave, item }: args) {
  return <div>
    <h3 style={H3Style}>
      {title === "Billing" ? String.fromCodePoint(128181) + " BILLING" : title === "Shipping" ? String.fromCodePoint(128230) + " SHIPPING" : null}
      {address && <AddressEditor address={address} onSave={onSave} item={item} />}
    </h3>
    <hr style={Hr} />
    {address && <div>
      {address.name}<br />
      {address.company && <span>{address.company}<br /></span>}
      {address.address1}<br />
      {address.address2 && <span>{address.address2}<br /></span>}
      {address.city}, {address.zip}, {address.state && `${address.state}, `} {address.country}
    </div>}
    <hr />
  </div>;
}
