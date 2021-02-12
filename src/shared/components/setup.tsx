import { Component, linkEvent } from 'inferno';
import { Helmet } from 'inferno-helmet';
import { Subscription } from 'rxjs';
import { retryWhen, delay, take } from 'rxjs/operators';
import { Register, LoginResponse, UserOperation } from 'lemmy-js-client';
import { WebSocketService, UserService } from '../services';
import { wsUserOp, wsJsonToRes, toast, wsClient } from '../utils';
import { SiteForm } from './site-form';
import { Spinner } from './icon';
import { i18n } from '../i18next';

interface State {
  userForm: Register;
  doneRegisteringUser: boolean;
  userLoading: boolean;
}

export class Setup extends Component<any, State> {
  private subscription: Subscription;

  private emptyState: State = {
    userForm: {
      username: undefined,
      password: undefined,
      password_verify: undefined,
      show_nsfw: true,
      // The first admin signup doesn't need a captcha
      captcha_uuid: '',
      captcha_answer: '',
    },
    doneRegisteringUser: false,
    userLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.subscription = WebSocketService.Instance.subject
      .pipe(retryWhen(errors => errors.pipe(delay(3000), take(10))))
      .subscribe(
        msg => this.parseMessage(msg),
        err => console.error(err),
        () => console.log('complete')
      );
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  get documentTitle(): string {
    return `${i18n.t('setup')} - Lemmy`;
  }

  render() {
    return (
      <div class="container">
        <Helmet title={this.documentTitle} />
        <div class="row">
          <div class="col-12 offset-lg-3 col-lg-6">
            <h3>{i18n.t('lemmy_instance_setup')}</h3>
            {!this.state.doneRegisteringUser ? (
              this.registerUser()
            ) : (
              <SiteForm />
            )}
          </div>
        </div>
      </div>
    );
  }

  registerUser() {
    return (
      <form onSubmit={linkEvent(this, this.handleRegisterSubmit)}>
        <h5>{i18n.t('setup_admin')}</h5>
        <div class="form-group row">
          <label class="col-sm-2 col-form-label" htmlFor="username">
            {i18n.t('username')}
          </label>
          <div class="col-sm-10">
            <input
              type="text"
              class="form-control"
              id="username"
              value={this.state.userForm.username}
              onInput={linkEvent(this, this.handleRegisterUsernameChange)}
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
            />
          </div>
        </div>
        <div class="form-group row">
          <label class="col-sm-2 col-form-label" htmlFor="email">
            {i18n.t('email')}
          </label>

          <div class="col-sm-10">
            <input
              type="email"
              id="email"
              class="form-control"
              placeholder={i18n.t('optional')}
              value={this.state.userForm.email}
              onInput={linkEvent(this, this.handleRegisterEmailChange)}
              minLength={3}
            />
          </div>
        </div>
        <div class="form-group row">
          <label class="col-sm-2 col-form-label" htmlFor="password">
            {i18n.t('password')}
          </label>
          <div class="col-sm-10">
            <input
              type="password"
              id="password"
              value={this.state.userForm.password}
              onInput={linkEvent(this, this.handleRegisterPasswordChange)}
              class="form-control"
              required
            />
          </div>
        </div>
        <div class="form-group row">
          <label class="col-sm-2 col-form-label" htmlFor="verify-password">
            {i18n.t('verify_password')}
          </label>
          <div class="col-sm-10">
            <input
              type="password"
              id="verify-password"
              value={this.state.userForm.password_verify}
              onInput={linkEvent(this, this.handleRegisterPasswordVerifyChange)}
              class="form-control"
              required
            />
          </div>
        </div>
        <div class="form-group row">
          <div class="col-sm-10">
            <button type="submit" class="btn btn-secondary">
              {this.state.userLoading ? <Spinner /> : i18n.t('sign_up')}
            </button>
          </div>
        </div>
      </form>
    );
  }

  handleRegisterSubmit(i: Setup, event: any) {
    event.preventDefault();
    i.state.userLoading = true;
    i.setState(i.state);
    event.preventDefault();
    WebSocketService.Instance.send(wsClient.register(i.state.userForm));
  }

  handleRegisterUsernameChange(i: Setup, event: any) {
    i.state.userForm.username = event.target.value;
    i.setState(i.state);
  }

  handleRegisterEmailChange(i: Setup, event: any) {
    i.state.userForm.email = event.target.value;
    i.setState(i.state);
  }

  handleRegisterPasswordChange(i: Setup, event: any) {
    i.state.userForm.password = event.target.value;
    i.setState(i.state);
  }

  handleRegisterPasswordVerifyChange(i: Setup, event: any) {
    i.state.userForm.password_verify = event.target.value;
    i.setState(i.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      this.state.userLoading = false;
      this.setState(this.state);
      return;
    } else if (op == UserOperation.Register) {
      let data = wsJsonToRes<LoginResponse>(msg).data;
      this.state.userLoading = false;
      this.state.doneRegisteringUser = true;
      UserService.Instance.login(data);
      this.setState(this.state);
    } else if (op == UserOperation.CreateSite) {
      window.location.href = '/';
    }
  }
}
