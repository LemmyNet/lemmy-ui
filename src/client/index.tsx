import { hydrate } from 'inferno-hydrate';
import { BrowserRouter } from 'inferno-router';
import { initializeSite } from '../shared/initialize';
import { App } from '../shared/components/app';

const site = window.isoData.site_res;
initializeSite(site);

const wrapper = (
  <BrowserRouter>
    <App siteRes={window.isoData.site_res} />
  </BrowserRouter>
);

hydrate(wrapper, document.getElementById('root'));
