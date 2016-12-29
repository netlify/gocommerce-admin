import React, {Component} from 'react';
import {List, Menu} from 'semantic-ui-react';

function calculatePages(current, last) {
  if (last <= 1) { return null; }

  const pages = [{name: "First", number: 1}];
  for (let page = 1; page <= last; page++) {
    if (page - current < -3) { continue; }
    if (current - page < -3) { continue; }
    pages.push({name: page, number: page, active: page === current});
  }
  pages.push({name: "Last", number: last});
  return pages;
}

export function pageFromURL() {
  const match = document.location.href.match(/page=(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 1;
}

export default function Pagination({current, next, last, total, perPage, onClick}) {
  const pages = calculatePages(current, last);
  if (!pages) { return null; }

  const from = (current - 1) * perPage;
  const to = Math.min(from + perPage, total);

  return <List horizontal>
    <List.Item>
      <Menu pagination>
        {pages.map((page, i) => <Menu.Item
          key={i}
          name={page.name.toString()}
          active={page.active}
          data-number={page.number}
          onClick={onClick}
        />)}
      </Menu>
    </List.Item>
    <List.Item>{from}-{to} of {total}</List.Item>
  </List>;
}
