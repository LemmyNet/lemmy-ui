import { Component, linkEvent } from "inferno";
import { HttpService } from "../../services";
import type { Badge, CreateBadge } from "@utils/types";
import { toast } from "@utils/app";
import { Spinner } from "../common/icon";
import { I18NextService } from "../../services";

interface BadgeManagementState {
  badges: Badge[];
  loading: boolean;
  creating: boolean;
  newBadge: CreateBadge;
}

export class BadgeManagement extends Component<{}, BadgeManagementState> {
  state: BadgeManagementState = {
    badges: [],
    loading: true,
    creating: false,
    newBadge: {
      name: "",
      description: "",
      image_url: "",
      is_assignable_by_mods: false,
      is_self_selectable: false,
    },
  };

  async componentDidMount() {
    await this.loadBadges();
  }

  async loadBadges() {
    this.setState({ loading: true });
    const res = await HttpService.listBadges();
    
    if (res.state === "success") {
      this.setState({ badges: res.data.badges, loading: false });
    } else {
      toast(I18NextService.i18n.t("failed_to_load_badges"), "danger");
      this.setState({ loading: false });
    }
  }

  async handleCreateBadge(i: BadgeManagement, event: Event) {
    event.preventDefault();
    i.setState({ creating: true });
    
    const res = await HttpService.createBadge(i.state.newBadge);
    
    if (res.state === "success") {
      toast(I18NextService.i18n.t("badge_created"), "success");
      await i.loadBadges();
      i.setState({
        creating: false,
        newBadge: {
          name: "",
          description: "",
          image_url: "",
          is_assignable_by_mods: false,
          is_self_selectable: false,
        },
      });
    } else {
      toast(I18NextService.i18n.t("failed_to_create_badge"), "danger");
      i.setState({ creating: false });
    }
  }

  async handleDeleteBadge(i: BadgeManagement, badgeId: number) {
    if (!confirm(I18NextService.i18n.t("confirm_delete_badge"))) return;
    
    const res = await HttpService.deleteBadge(badgeId);
    
    if (res.state === "success") {
      toast(I18NextService.i18n.t("badge_deleted"), "success");
      await i.loadBadges();
    } else {
      toast(I18NextService.i18n.t("failed_to_delete_badge"), "danger");
    }
  }

  handleInputChange(field: keyof CreateBadge, value: string | boolean) {
    this.setState({
      newBadge: { ...this.state.newBadge, [field]: value },
    });
  }

  render() {
    if (this.state.loading) {
      return (
        <div className="text-center">
          <Spinner large />
        </div>
      );
    }

    return (
      <div className="badge-management">
        <h2>{I18NextService.i18n.t("badge_management")}</h2>

        {/* Create Badge Form */}
        <form
          onSubmit={linkEvent(this, this.handleCreateBadge)}
          className="mb-4 card"
        >
          <div className="card-body">
            <h3>{I18NextService.i18n.t("create_new_badge")}</h3>
            
            <div className="mb-3">
              <label className="form-label">
                {I18NextService.i18n.t("name")}
              </label>
              <input
                type="text"
                className="form-control"
                value={this.state.newBadge.name}
                onInput={e =>
                  this.handleInputChange("name", e.currentTarget.value)
                }
                required
                maxLength={100}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                {I18NextService.i18n.t("description")}
              </label>
              <textarea
                className="form-control"
                value={this.state.newBadge.description}
                onInput={e =>
                  this.handleInputChange("description", e.currentTarget.value)
                }
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                {I18NextService.i18n.t("image_url")}
              </label>
              <input
                type="url"
                className="form-control"
                value={this.state.newBadge.image_url}
                onInput={e =>
                  this.handleInputChange("image_url", e.currentTarget.value)
                }
                required
                placeholder="https://example.com/badge.png"
              />
              {this.state.newBadge.image_url && (
                <div className="mt-2">
                  <img
                    src={this.state.newBadge.image_url}
                    alt="Preview"
                    style={{ width: "40px", height: "40px" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="assignable-by-mods"
                checked={this.state.newBadge.is_assignable_by_mods}
                onChange={e =>
                  this.handleInputChange(
                    "is_assignable_by_mods",
                    e.currentTarget.checked,
                  )
                }
              />
              <label className="form-check-label" htmlFor="assignable-by-mods">
                {I18NextService.i18n.t("assignable_by_mods")}
              </label>
            </div>

            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="self-selectable"
                checked={this.state.newBadge.is_self_selectable}
                onChange={e =>
                  this.handleInputChange(
                    "is_self_selectable",
                    e.currentTarget.checked,
                  )
                }
              />
              <label className="form-check-label" htmlFor="self-selectable">
                {I18NextService.i18n.t("self_selectable")}
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={this.state.creating}
            >
              {this.state.creating ? (
                <Spinner />
              ) : (
                I18NextService.i18n.t("create_badge")
              )}
            </button>
          </div>
        </form>

        {/* Badge List */}
        <div className="card">
          <div className="card-body">
            <h3>{I18NextService.i18n.t("existing_badges")}</h3>
            {this.state.badges.length === 0 ? (
              <p className="text-muted">
                {I18NextService.i18n.t("no_badges_yet")}
              </p>
            ) : (
              <div className="badge-list">
                {this.state.badges.map(badge => (
                  <div key={badge.id} className="card mb-2">
                    <div className="card-body d-flex align-items-center">
                      <img
                        src={badge.image_url}
                        alt={badge.name}
                        style={{
                          width: "40px",
                          height: "40px",
                          objectFit: "contain",
                        }}
                      />
                      <div className="ms-3 flex-grow-1">
                        <h5 className="mb-1">{badge.name}</h5>
                        {badge.description && (
                          <p className="text-muted mb-1 small">
                            {badge.description}
                          </p>
                        )}
                        <div>
                          {badge.is_assignable_by_mods && (
                            <span className="badge bg-info me-1">
                              {I18NextService.i18n.t("mod_assignable")}
                            </span>
                          )}
                          {badge.is_self_selectable && (
                            <span className="badge bg-success">
                              {I18NextService.i18n.t("self_selectable")}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => this.handleDeleteBadge(this, badge.id)}
                      >
                        {I18NextService.i18n.t("delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
