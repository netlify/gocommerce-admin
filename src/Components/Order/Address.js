import React from "react";

export default function({title, address, href, onLink}) {
  return <div>
    <h3>
      {title}
      <a className="ui basic compact right floated button" href={href} onClick={onLink}>Edit</a>
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
