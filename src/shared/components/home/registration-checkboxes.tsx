import { I18NextService } from "@services/I18NextService";

type RegistrationCheckboxesProps = {
    form: {
        show_nsfw: boolean;
        honeypot?: string;
        stay_logged_in: boolean;
    };
    onRegisterShowNsfwChange: (checked: boolean) => void;
    onStayLoggedInChange: (checked: boolean) => void;
    onHoneyPotChange?: (value: string) => void;
}

export function RegistrationCheckboxes({ onRegisterShowNsfwChange, onHoneyPotChange, onStayLoggedInChange, form: { show_nsfw, honeypot, stay_logged_in } }: RegistrationCheckboxesProps) {
    return (<><div className="mb-3">
        <div className="form-check">
            <input
                className="form-check-input"
                id="register-show-nsfw"
                type="checkbox"
                checked={show_nsfw}
                onChange={e => onRegisterShowNsfwChange(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="register-show-nsfw">
                {I18NextService.i18n.t("show_nsfw")}
            </label>
        </div>
    </div>
        <input
            tabIndex={-1}
            autoComplete="false"
            name="a_password"
            type="text"
            className="form-control honeypot"
            id="register-honey"
            value={honeypot}
            onInput={e => onHoneyPotChange && onHoneyPotChange(e.target.value)}
        />
        <div className="input-group mb-3">
            <div className="form-check">
                <input
                    className="form-check-input"
                    id="register-stay-logged-in"
                    type="checkbox"
                    checked={stay_logged_in}
                    onChange={e => onStayLoggedInChange(e.target.checked)}
                />
                <label
                    className="form-check-label"
                    htmlFor="register-stay-logged-in"
                >
                    {I18NextService.i18n.t("stay_logged_in")}
                </label>
            </div>
        </div></>
    );
}