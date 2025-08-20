import {
  Component,
  InfernoKeyboardEvent,
  InfernoNode,
  linkEvent,
} from "inferno";
import { Instance, SuccessResponse } from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { Icon } from "../common/icon";
import { RequestState } from "../../services/HttpService";
import { toast } from "@utils/app";
import { validInstanceTLD } from "@utils/helpers";

interface InstanceBlocksProps {
  blockedInstances?: Instance[];
  allowedInstances?: Instance[];
}

interface InstanceBlocksState {
  instance_select: {
    allowed_instances: string;
    blocked_instances: string;
  };
  instances: {
    allowed_instances: string[];
    blocked_instances: string[];
  };
}

type InstanceKey = "allowed_instances" | "blocked_instances";

export class InstanceBlocks extends Component<
  InstanceBlocksProps,
  InstanceBlocksState
> {
  state: InstanceBlocksState = {
    instance_select: {
      allowed_instances: "",
      blocked_instances: "",
    },
    instances: {
      allowed_instances: [],
      blocked_instances: [],
    },
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleAddInstance = this.handleAddInstance.bind(this);
    this.handleRemoveInstance = this.handleRemoveInstance.bind(this);

    this.handleInstanceEnterPress = this.handleInstanceEnterPress.bind(this);
    this.handleInstanceTextChange = this.handleInstanceTextChange.bind(this);

    const allowed_instances = (this.props.allowedInstances ?? []).map(
      i => i.domain,
    );
    const blocked_instances = (this.props.blockedInstances ?? []).map(
      i => i.domain,
    );
    this.state.instances = {
      allowed_instances,
      blocked_instances,
    };
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & InstanceBlocksProps>,
  ): void {
    if (
      this.props.allowedInstances !== nextProps.allowedInstances ||
      this.props.blockedInstances !== nextProps.blockedInstances
    ) {
      const allowed_instances = (this.props.allowedInstances ?? []).map(
        i => i.domain,
      );
      const blocked_instances = (this.props.blockedInstances ?? []).map(
        i => i.domain,
      );
      this.setState({
        instances: {
          allowed_instances,
          blocked_instances,
        },
      });
    }
  }

  render() {
    return (
      <div className="mb-3 row">
        {this.federatedInstanceSelect("allowed_instances")}
        {this.federatedInstanceSelect("blocked_instances")}
      </div>
    );
  }

  federatedInstanceSelect(key: InstanceKey) {
    const id = `create_site_${key}`;
    const value = this.state.instance_select[key];
    const selectedInstances = this.state.instances[key];
    const oppositeKey: InstanceKey =
      key === "allowed_instances" ? "blocked_instances" : "allowed_instances";
    const disabled = this.state.instances[oppositeKey].length !== 0;
    return (
      <div className="col-12 col-md-6">
        <label className="col-form-label" htmlFor={id}>
          {I18NextService.i18n.t(key)}
        </label>
        <div className="d-flex justify-content-between align-items-center">
          <div className="input-group ms-2">
            <input
              type="text"
              placeholder="instance.tld"
              id={id}
              className="form-control"
              value={value}
              onInput={linkEvent(key, this.handleInstanceTextChange)}
              onKeyUp={linkEvent(key, this.handleInstanceEnterPress)}
              disabled={disabled}
            />
            <button
              type="button"
              className="btn bg-success"
              onClick={linkEvent(key, this.handleAddInstance)}
              tabIndex={
                -1 /* Making this untabble because handling enter key in text input makes keyboard support for this button redundant */
              }
            >
              <Icon
                icon="add"
                classes="icon-inline text-light m-auto d-block position-static"
              />
            </button>
          </div>
        </div>
        {selectedInstances && selectedInstances.length > 0 && (
          <ul className="mt-3 list-unstyled w-100 d-flex flex-column justify-content-around align-items-center">
            {selectedInstances.map(instance => (
              <li
                key={instance}
                className="my-1 w-100 w-md-75 d-flex align-items-center justify-content-between"
              >
                <label className="d-block m-0 w-100 " htmlFor={instance}>
                  <strong>{instance}</strong>
                </label>
                <button
                  id={instance}
                  type="button"
                  className="btn btn-sm bg-danger"
                  onClick={linkEvent(
                    { key, instance },
                    this.handleRemoveInstance,
                  )}
                >
                  <Icon
                    icon="x"
                    classes="icon-inline text-light m-auto d-block position-static"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  handleInstanceTextChange(type: InstanceKey, event: any) {
    this.setState(s => ({
      instance_select: {
        ...s.instance_select,
        [type]: event.target.value,
      },
    }));
  }

  handleInstanceEnterPress(
    key: InstanceKey,
    event: InfernoKeyboardEvent<HTMLInputElement>,
  ) {
    if (event.code.toLowerCase() === "enter") {
      event.preventDefault();

      this.handleAddInstance(key);
    }
  }

  async handleAddInstance(key: InstanceKey) {
    const instance = this.state.instance_select[key].trim();

    if (!validInstanceTLD(instance)) {
      return;
    }

    if (!this.state.instances[key].includes(instance)) {
      let res: RequestState<SuccessResponse>;
      if (key === "blocked_instances") {
        res = await HttpService.client.adminBlockInstance({
          instance: instance,
          block: true,
        });
      } else {
        res = await HttpService.client.adminAllowInstance({
          instance: instance,
          allow: true,
        });
      }
      if (res.state === "success") {
        this.setState(s => {
          s.instances[key].push(instance);
          return {
            instances: {
              ...s.instances,
            },
          };
        });
        toast(
          I18NextService.i18n.t("added_item_to_list", {
            item: instance,
            list: I18NextService.i18n.t(
              key === "blocked_instances" ? "blocklist" : "allowlist",
            ),
          }),
        );
      }
    }
  }

  async handleRemoveInstance({
    key,
    instance,
  }: {
    key: InstanceKey;
    instance: string;
  }) {
    let res: RequestState<SuccessResponse>;
    if (key === "blocked_instances") {
      res = await HttpService.client.adminBlockInstance({
        instance: instance,
        block: false,
      });
    } else {
      res = await HttpService.client.adminAllowInstance({
        instance: instance,
        allow: false,
      });
    }
    if (res.state === "success") {
      this.setState(s => ({
        instances: {
          ...s.instances,
          [key]: s.instances[key].filter(i => i !== instance),
        },
      }));
      toast(
        I18NextService.i18n.t("removed_item_from_list", {
          item: instance,
          list: I18NextService.i18n.t(
            key === "blocked_instances" ? "blocklist" : "allowlist",
          ),
        }),
      );
    }
  }
}
