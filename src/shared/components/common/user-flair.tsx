import classNames from "classnames";
import { Component } from "inferno";
import type { UserFlairType } from "@utils/helpers/user-flair-type";

interface UserFlairProps {
  userFlair: UserFlairType | null;
  classNames?: string;
  imageSize?: string;
}

export class UserFlair extends Component<UserFlairProps> {
  render() {
    const flair = this.props.userFlair;

    return (
      (flair != null) && (
        <div
          className={classNames("badge text-dark d-inline px-1", this.props.classNames)}
        >
          {flair.image.length > 0 && (<img src={flair.image} style={`height:${this.props.imageSize || "1rem"};`}/>)}
          <span class="ms-1 fw-semibold"> {flair.name} </span>
        </div>
      )
    );
  }
}
