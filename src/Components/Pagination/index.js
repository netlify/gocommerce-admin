// @flow
import React, { Component } from "react";
import { List, Menu } from "semantic-ui-react";
import ChevronLeftIcon from "mdi-react/ChevronLeftIcon";
import ChevronRightIcon from "mdi-react/ChevronRightIcon";

function calculatePages(current: number, last: number) {
  if (last <= 1) {
    return null;
  }

  const pages = [{ name: "First", number: 1 }];
  for (let page = 1; page <= last; page++) {
    if (page - current < -3) {
      continue;
    }
    if (current - page < -3) {
      continue;
    }
    pages.push({
      name: page.toString(),
      number: page,
      active: page === current
    });
  }
  pages.push({ name: "Last", number: last });
  return pages;
}

export function pageFromURL() {
  const match = document.location.href.match(/page=(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 1;
}

type args = {
  current: number,
  next: ?number,
  last: number,
  total: number,
  perPage: number,
  onClick: (SyntheticEvent, Object) => void
};
export default function Pagination({
  current,
  next,
  last,
  total,
  perPage,
  onClick
}: args) {
  const pages = calculatePages(current, last);
  if (!pages) {
    return null;
  }

  const from = (current - 1) * perPage;
  const to = Math.min(from + perPage, total);
  const paginationText = current + "of" + last;
  
  return (
    <List horizontal>
      <List.Item>
        <Menu pagination>
          {current !== 1 && (
            <Menu.Item name="Back" data-number={current - 1} onClick={onClick}>
              <ChevronLeftIcon size="16" color="#1667D6" />
            </Menu.Item>
          )}
          <Menu.Item name={paginationText} />
          <Menu.Item name="Forward" data-number={current + 1} onClick={onClick}>
            <ChevronRightIcon size="16" color="#1667D6" />
          </Menu.Item>
        </Menu>
      </List.Item>
    </List>
  );
}
