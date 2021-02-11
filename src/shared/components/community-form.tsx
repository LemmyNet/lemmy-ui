import { Component, linkEvent } from 'inferno';
import { Prompt } from 'inferno-router';
import { Subscription } from 'rxjs';
import {
  EditCommunity,
  CreateCommunity,
  UserOperation,
  Category,
  CommunityResponse,
  CommunityView,
} from 'lemmy-js-client';
import { WebSocketService } from '../services';
import {
  wsJsonToRes,
  capitalizeFirstLetter,
  toast,
  randomStr,
  wsSubscribe,
  wsUserOp,
  wsClient,
  authField,
} from '../utils';
import { i18n } from '../i18next';

import { MarkdownTextArea } from './markdown-textarea';
import { ImageUploadForm } from './image-upload-form';
import { Icon, Spinner } from './icon';

interface CommunityFormProps {
  community_view?: CommunityView; // If a community is given, that means this is an edit
  categories: Category[];
  onCancel?(): any;
  onCreate?(community: CommunityView): any;
  onEdit?(community: CommunityView): any;
  enableNsfw: boolean;
}

interface CommunityFormState {
  communityForm: CreateCommunity;
  loading: boolean;
}

export class CommunityForm extends Component<
  CommunityFormProps,
  CommunityFormState
> {
  private id = `community-form-${randomStr()}`;
  private subscription: Subscription;

  private emptyState: CommunityFormState = {
    communityForm: {
      name: null,
      title: null,
      category_id: this.props.categories[0].id,
      nsfw: false,
      icon: null,
      banner: null,
      auth: authField(false),
    },
    loading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.handleCommunityDescriptionChange = this.handleCommunityDescriptionChange.bind(
      this
    );

    this.handleIconUpload = this.handleIconUpload.bind(this);
    this.handleIconRemove = this.handleIconRemove.bind(this);

    this.handleBannerUpload = this.handleBannerUpload.bind(this);
    this.handleBannerRemove = this.handleBannerRemove.bind(this);

    let cv = this.props.community_view;
    if (cv) {
      this.state.communityForm = {
        name: cv.community.name,
        title: cv.community.title,
        category_id: cv.category.id,
        description: cv.community.description,
        nsfw: cv.community.nsfw,
        icon: cv.community.icon,
        banner: cv.community.banner,
        auth: authField(),
      };
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
  }

  // TODO this should be checked out
  componentDidUpdate() {
    if (
      !this.state.loading &&
      (this.state.communityForm.name ||
        this.state.communityForm.title ||
        this.state.communityForm.description)
    ) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    window.onbeforeunload = null;
  }

  render() {
    return (
      <>
        <Prompt
          when={
            !this.state.loading &&
            (this.state.communityForm.name ||
              this.state.communityForm.title ||
              this.state.communityForm.description)
          }
          message={i18n.t('block_leaving')}
        />
        <form onSubmit={linkEvent(this, this.handleCreateCommunitySubmit)}>
          {!this.props.community_view && (
            <div class="form-group row">
              <label class="col-12 col-form-label" htmlFor="community-name">
                {i18n.t('name')}
                <span
                  class="pointer unselectable ml-2 text-muted"
                  data-tippy-content={i18n.t('name_explain')}
                >
                  <Icon icon="help-circle" classes="icon-inline" />
                </span>
              </label>
              <div class="col-12">
                <input
                  type="text"
                  id="community-name"
                  class="form-control"
                  value={this.state.communityForm.name}
                  onInput={linkEvent(this, this.handleCommunityNameChange)}
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-z0-9_]+"
                  title={i18n.t('community_reqs')}
                />
              </div>
            </div>
          )}
          <div class="form-group row">
            <label class="col-12 col-form-label" htmlFor="community-title">
              {i18n.t('display_name')}
              <span
                class="pointer unselectable ml-2 text-muted"
                data-tippy-content={i18n.t('display_name_explain')}
              >
                <Icon icon="help-circle" classes="icon-inline" />
              </span>
            </label>
            <div class="col-12">
              <input
                type="text"
                id="community-title"
                value={this.state.communityForm.title}
                onInput={linkEvent(this, this.handleCommunityTitleChange)}
                class="form-control"
                required
                minLength={3}
                maxLength={100}
              />
            </div>
          </div>
          <div class="form-group">
            <label>{i18n.t('icon')}</label>
            <ImageUploadForm
              uploadTitle={i18n.t('upload_icon')}
              imageSrc={this.state.communityForm.icon}
              onUpload={this.handleIconUpload}
              onRemove={this.handleIconRemove}
              rounded
            />
          </div>
          <div class="form-group">
            <label>{i18n.t('banner')}</label>
            <ImageUploadForm
              uploadTitle={i18n.t('upload_banner')}
              imageSrc={this.state.communityForm.banner}
              onUpload={this.handleBannerUpload}
              onRemove={this.handleBannerRemove}
            />
          </div>
          <div class="form-group row">
            <label class="col-12 col-form-label" htmlFor={this.id}>
              {i18n.t('sidebar')}
            </label>
            <div class="col-12">
              <MarkdownTextArea
                initialContent={this.state.communityForm.description}
                onContentChange={this.handleCommunityDescriptionChange}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-12 col-form-label" htmlFor="community-category">
              {i18n.t('category')}
            </label>
            <div class="col-12">
              <select
                class="form-control"
                id="community-category"
                value={this.state.communityForm.category_id}
                onInput={linkEvent(this, this.handleCommunityCategoryChange)}
              >
                {this.props.categories.map(category => (
                  <option value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          {this.props.enableNsfw && (
            <div class="form-group row">
              <div class="col-12">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    id="community-nsfw"
                    type="checkbox"
                    checked={this.state.communityForm.nsfw}
                    onChange={linkEvent(this, this.handleCommunityNsfwChange)}
                  />
                  <label class="form-check-label" htmlFor="community-nsfw">
                    {i18n.t('nsfw')}
                  </label>
                </div>
              </div>
            </div>
          )}
          <div class="form-group row">
            <div class="col-12">
              <button
                type="submit"
                class="btn btn-secondary mr-2"
                disabled={this.state.loading}
              >
                {this.state.loading ? (
                  <Spinner />
                ) : this.props.community_view ? (
                  capitalizeFirstLetter(i18n.t('save'))
                ) : (
                  capitalizeFirstLetter(i18n.t('create'))
                )}
              </button>
              {this.props.community_view && (
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={linkEvent(this, this.handleCancel)}
                >
                  {i18n.t('cancel')}
                </button>
              )}
            </div>
          </div>
        </form>
      </>
    );
  }

  handleCreateCommunitySubmit(i: CommunityForm, event: any) {
    event.preventDefault();
    i.state.loading = true;
    if (i.props.community_view) {
      let form: EditCommunity = {
        ...i.state.communityForm,
        community_id: i.props.community_view.community.id,
      };
      WebSocketService.Instance.send(wsClient.editCommunity(form));
    } else {
      WebSocketService.Instance.send(
        wsClient.createCommunity(i.state.communityForm)
      );
    }
    i.setState(i.state);
  }

  handleCommunityNameChange(i: CommunityForm, event: any) {
    i.state.communityForm.name = event.target.value;
    i.setState(i.state);
  }

  handleCommunityTitleChange(i: CommunityForm, event: any) {
    i.state.communityForm.title = event.target.value;
    i.setState(i.state);
  }

  handleCommunityDescriptionChange(val: string) {
    this.state.communityForm.description = val;
    this.setState(this.state);
  }

  handleCommunityCategoryChange(i: CommunityForm, event: any) {
    i.state.communityForm.category_id = Number(event.target.value);
    i.setState(i.state);
  }

  handleCommunityNsfwChange(i: CommunityForm, event: any) {
    i.state.communityForm.nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleCancel(i: CommunityForm) {
    i.props.onCancel();
  }

  handleIconUpload(url: string) {
    this.state.communityForm.icon = url;
    this.setState(this.state);
  }

  handleIconRemove() {
    this.state.communityForm.icon = '';
    this.setState(this.state);
  }

  handleBannerUpload(url: string) {
    this.state.communityForm.banner = url;
    this.setState(this.state);
  }

  handleBannerRemove() {
    this.state.communityForm.banner = '';
    this.setState(this.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      this.state.loading = false;
      this.setState(this.state);
      return;
    } else if (op == UserOperation.CreateCommunity) {
      let data = wsJsonToRes<CommunityResponse>(msg).data;
      this.state.loading = false;
      this.props.onCreate(data.community_view);
    } else if (op == UserOperation.EditCommunity) {
      let data = wsJsonToRes<CommunityResponse>(msg).data;
      this.state.loading = false;
      this.props.onEdit(data.community_view);
    }
  }
}
