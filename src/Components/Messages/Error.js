// @flow
import React from 'react';
import {Message} from 'semantic-ui-react';

export default function({error}: Object) {
  return error && <Message negative>
    <Message.Header>An error happened while loading the orders</Message.Header>
    <p>{(error.description || error.msg || error.data || error.toString())}</p>
  </Message>;
}
