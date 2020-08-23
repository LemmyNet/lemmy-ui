import { Component } from 'inferno';
import { hydrate } from 'inferno-hydrate';
import { BrowserRouter } from 'inferno-router';
import App from './components/App/App';
import { initDevTools } from 'inferno-devtools';

declare global {
  interface Window {
    isoData: {
      name: string;
    };
  }
}

const wrapper = (
  <BrowserRouter>
    <App name={window.isoData.name} />
  </BrowserRouter>
);
initDevTools();
hydrate(wrapper, document.getElementById('root'));
