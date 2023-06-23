import { Component } from 'inferno';
import { Icon } from "../common/icon";

export class UserFlairModal extends Component {
    showDialog = () => {
        const userFlairDialog = document.getElementById("userFlairDialog") as HTMLDialogElement;
        userFlairDialog.showModal();
    }

  render() {
    document.addEventListener("DOMContentLoaded", () => {
        const userFlairDialog = document.getElementById("userFlairDialog") as HTMLDialogElement;
        const selectEl = userFlairDialog.querySelector("select") as HTMLSelectElement ; //TODO change
        const confirmFlairBtn = userFlairDialog.querySelector("#confirmFlairBtn") as HTMLInputElement ;

        selectEl.focus();

        // "Favorite animal" input sets the value of the submit button
        selectEl.addEventListener("change", () => {
            confirmFlairBtn.value = selectEl.value;
        });

        // Prevent the "confirm" button from the default behavior of submitting the form, and close the dialog with the `close()` method, which triggers the "close" event.
        confirmFlairBtn.addEventListener("click", (event) => {
            event.preventDefault(); // We don't want to submit this fake form
            userFlairDialog.close(selectEl.value); // Have to send the select box value here.

            const val = userFlairDialog.returnValue;
            if(val !== 'cancel' && val !== 'default') console.log('Flair picked: ', val);

        });
    });

    return (
        <dialog id="userFlairDialog" class="bg-light text-dark rounded" style="border-width: 1px;">
            <form>
                <div class="row justify-content-end mx-0">
                    <button class="btn btn-outline-dark btn-sm rounded-circle" value="cancel" formMethod="dialog">                  
                        <Icon icon="x" classes="icon-inline fs-6" />
                    </button>
                </div>
            <p>
                <label>
                Pick your flair:
                <br></br>
                <select>
                    <option value="default">Choose…</option>
                    <option>🟦 - AuthRight</option>
                    <option>🟥 - AuthLeft</option>
                    <option>🟩 - LibLeft</option>
                </select>
                </label>
            </p>
            <div style="display:grid;grid-template-columns: repeat(4, minmax(0, 1fr));">
                <div/>
                <div/>
                <div/>
                <button class="btn btn-dark" id="confirmFlairBtn" value="default">Confirm</button>
            </div>
            </form>
        </dialog>
    );
  }
}