# GoCommerce Admin UI

This is the admin UI for [GoCommerce](https://github.com/netlify/gocommerce), an open-source headless e-commerce.

## Installing

Clone this repository, then run:

```
yarn
yarn start
```

To use against a production gocommerce install, make sure to set environment variables for:

* **REACT_APP_SITE_URL** the URL of the ecommerce website
* **REACT_APP_NETLIFY_AUTH** the URL of the GoTrue instance used to manage authentication
* **REACT_APP_NETLIFY_COMMERCE** The URL of the GoCommerce instance
