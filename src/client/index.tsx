import { Component } from 'inferno';
import { hydrate } from 'inferno-hydrate';
import { BrowserRouter } from 'inferno-router';
import { App } from '../shared/components/app';
/* import { initDevTools } from 'inferno-devtools'; */

declare global {
  interface Window {
    isoData: {
      name: string;
    };
  }
}

const wrapper = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
/* initDevTools(); */
hydrate(wrapper, document.getElementById('root'));
