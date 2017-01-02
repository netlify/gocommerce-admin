// @flow
import type {Address} from '../../Types';
import React from "react";

type args = {title: string, address: ?Address, href: string, onLink: (SyntheticEvent) => void};
export default function({title, address, href, onLink}: args) {
  return <div>
    <h3>
      {title}
      <a className="ui basic compact right floated button" href={href} onClick={onLink}>Edit</a>
    </h3>

    {address && <div>
      {address.first_name} {address.last_name}<br/>
      {address.company && <span>{address.company}<br/></span>}
      {address.address1}<br/>
      {address.address2 && <span>{address.address2}<br/></span>}
      {address.city}, {address.zip}, {address.state && `${address.state}, `} {address.country}
    </div>}
  </div>;
}
