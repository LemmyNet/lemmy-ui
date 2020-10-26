import { hydrate } from 'inferno-hydrate';
import { BrowserRouter } from 'inferno-router';
import { initializeSite } from '../shared/initialize';
import { App } from '../shared/components/app';

const site = window.isoData.site;
initializeSite(site);

const wrapper = (
  <BrowserRouter>
    <App site={window.isoData.site} />
  </BrowserRouter>
);

hydrate(wrapper, document.getElementById('root'));
