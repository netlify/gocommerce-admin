// @flow
import React from "react";
import {Breadcrumb, Grid, Divider} from 'semantic-ui-react';

type Link = {label: string, href: string};

export default function({breadcrumb, menu, onLink, children}: Object) {
  const crumbs: Array<Link> = [];
  breadcrumb.forEach((crumb, i) => {
    crumbs.push(
      <Breadcrumb.Section key={i} href={crumb.href} active={i === (breadcrumb.length - 1)} onClick={onLink}>
        {crumb.label}
      </Breadcrumb.Section>
    );
    if (i < breadcrumb.length - 1) {
      crumbs.push(<Breadcrumb.Divider/>);
    }
  });

  return <div>
    <Grid>
      <Grid.Row columns={2}>
        <Grid.Column>
          <Breadcrumb>{crumbs}</Breadcrumb>
        </Grid.Column>
        <Grid.Column textAlign="right">{menu}</Grid.Column>
      </Grid.Row>
    </Grid>

    <Divider/>

    {children}
  </div>
}
