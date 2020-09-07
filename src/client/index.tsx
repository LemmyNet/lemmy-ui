import { hydrate } from 'inferno-hydrate';
import { BrowserRouter } from 'inferno-router';
import { App } from '../shared/components/app';

const wrapper = (
  <BrowserRouter>
    <App site={window.isoData.site} />
  </BrowserRouter>
);

hydrate(wrapper, document.getElementById('root'));
