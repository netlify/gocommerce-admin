import React from "react";
import {Button} from "semantic-ui-react";
import {Link} from "react-router";

export default function({title, address, href}) {
  return <div>
    <h3>
      {title}
      <Link className="ui basic compact right floated button" to={href}>Edit</Link>
    </h3>

    {address && <div>
      {address.first_name} {address.last_name}<br/>
      {address.company && <span>{address.company}<br/></span>}
      {address.addressess1}<br/>
      {address.addressess2 && <span>{address.addressess2}<br/></span>}
      {address.city}, {address.zip}, {address.state && `${address.state}, `} {address.country}
    </div>}
  </div>;
}
