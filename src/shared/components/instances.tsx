import { Component } from 'inferno';
import { Helmet } from 'inferno-helmet';
import { GetSiteResponse } from 'lemmy-js-client';
import { setIsoData } from '../utils';
import { i18n } from '../i18next';

interface InstancesState {
  siteRes: GetSiteResponse;
}

export class Instances extends Component<any, InstancesState> {
  private isoData = setIsoData(this.context);
  private emptyState: InstancesState = {
    siteRes: this.isoData.site,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
  }

  get documentTitle(): string {
    return `${i18n.t('instances')} - ${this.state.siteRes.site.name}`;
  }

  render() {
    return (
      <div class="container">
        <Helmet title={this.documentTitle} />
        <div>
          <h5>{i18n.t('linked_instances')}</h5>
          {this.state.siteRes &&
          this.state.siteRes.federated_instances.length ? (
            <ul>
              {this.state.siteRes.federated_instances.map(i => (
                <li>
                  <a href={`https://${i}`} target="_blank" rel="noopener">
                    {i}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div>{i18n.t('none_found')}</div>
          )}
        </div>
      </div>
    );
  }
}
