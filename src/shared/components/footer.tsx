import { Component } from 'inferno';
import { Link } from 'inferno-router';
import { i18n } from '../i18next';
import { repoUrl, joinLemmyUrl } from '../utils';
import { GetSiteResponse } from 'lemmy-js-client';

interface FooterProps {
  site: GetSiteResponse;
}

interface FooterState {}

export class Footer extends Component<FooterProps, FooterState> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <nav class="container navbar navbar-expand-md navbar-light navbar-bg p-0 px-3 mt-2">
        <div className="navbar-collapse">
          <ul class="navbar-nav ml-auto">
            <li class="nav-item">
              <span class="navbar-text">{this.props.site.version}</span>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/modlog">
                {i18n.t('modlog')}
              </Link>
            </li>
            <li class="nav-item">
              <Link className="nav-link" to="/instances">
                {i18n.t('instances')}
              </Link>
            </li>
            <li class="nav-item">
              <a className="nav-link" href={'/docs/index.html'}>
                {i18n.t('docs')}
              </a>
            </li>
            <li class="nav-item">
              <a className="nav-link" href={repoUrl}>
                {i18n.t('code')}
              </a>
            </li>
            <li class="nav-item">
              <a className="nav-link" href={joinLemmyUrl}>
                {i18n.t('join_lemmy')}
              </a>
            </li>
          </ul>
        </div>
      </nav>
    );
  }
}
