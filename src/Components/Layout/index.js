// @flow
import React from "react";
import {Breadcrumb, Grid, Divider} from 'semantic-ui-react';

type Link = {label: string, href: string};

export default function({menu, onLink, children}: Object) {
  return <div>
    <Grid>
      <Grid.Row columns={2}>
        <Grid.Column>
        </Grid.Column>
        <Grid.Column textAlign="right">{menu}</Grid.Column>
      </Grid.Row>
    </Grid>

    {children}
  </div>
}
