import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router';
import App from './App';
import './index.css';

ReactDOM.render(
  <BrowserRouter><App /></BrowserRouter>,
  document.getElementById('root')
);
