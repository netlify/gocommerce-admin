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

## Semantic UI Styling
This UI uses a custom theme built using [Semantic UI React](https://react.semantic-ui.com/theming) framework.

To make changes to the theme, modifiy the variable and override files (which are stored inside the `collections`, `elements`, `globals`, `modules` and `views` folders) inside the site folder.
```
src/semantic/src/site
```
It is inside here you will find the files for all component styles and variables. 
More information about how to create and work with Semantic's theming can be found here:
[Semantic theming](https://semantic-ui.com/usage/theming.html)

To build all css files run:
```
yarn build:css
```
This compiles the variable and overide files to css files.

To watch for css changes run:
```
yarn watch:css
```
