import { Component } from 'inferno';
import { Icon } from "../common/icon";
import { UserFlair, clearUserFlair, setUserFlair } from '@utils/helpers/user-flairs';

const flairs = [{
    "id": "0",
    "name": "AuthLeft",
    "image": "https://emoji.redditmedia.com/tusmt4eqnar31_t5_3ipa1/authleft"
  },{
    "id": "1",
    "name": "AuthCenter",
    "image": "https://emoji.redditmedia.com/16q94zxonar31_t5_3ipa1/auth"
  },{
    "id": "2",
    "name": "AuthRight",
    "image": "https://emoji.redditmedia.com/4ak3jtrrnar31_t5_3ipa1/authright"
  },{
    "id": "3",
    "name": "Left",
    "image": "https://emoji.redditmedia.com/w977vwiynar31_t5_3ipa1/left"
  },{
    "id": "4",
    "name": "Centrist",
    "image": "https://emoji.redditmedia.com/6zhv8hgvoar31_t5_3ipa1/centrist"
  },{
    "id": "5",
    "name": "Right",
    "image": "https://emoji.redditmedia.com/x5otkjy5oar31_t5_3ipa1/right"
  },{
    "id": "6",
    "name": "LibLeft",
    "image": "https://emoji.redditmedia.com/d4hfiki0oar31_t5_3ipa1/libleft"
  },{
    "id": "7",
    "name": "LibCenter",
    "image": "https://emoji.redditmedia.com/s03ozdmznar31_t5_3ipa1/lib"
  },{
    "id": "8",
    "name": "LibRight",
    "image": "https://emoji.redditmedia.com/hts92712oar31_t5_3ipa1/libright"
  },{
    "id": "9",
    "name": "Centrist",
    "image": "https://emoji.redditmedia.com/bxv3jzc85q851_t5_3ipa1/CENTG"
  },{
    "id": "10",
    "name": "LibRight",
    "image": "https://emoji.redditmedia.com/9usjafiot7t31_t5_3ipa1/libright2"
}] satisfies UserFlair[];

interface UserFlairModalProp {
  userFlair: UserFlair | null;
  onUserFlairUpdate: (newFlair: UserFlair | null) => void;
}

export class UserFlairModal extends Component<UserFlairModalProp> {
    showDialog = () => {
        const userFlairDialog = document.getElementById("userFlairDialog") as HTMLDialogElement;
        userFlairDialog.showModal();
    }

    async componentDidMount() {
      const userFlairDialog = document.getElementById("userFlairDialog") as HTMLDialogElement;
        const removeFlairBtn = userFlairDialog.querySelector("#removeFlairBtn") as HTMLInputElement ;
        const confirmFlairBtn = userFlairDialog.querySelector("#confirmFlairBtn") as HTMLInputElement ;

        confirmFlairBtn.addEventListener("click", (event) => {
            event.preventDefault(); // We don't want to submit this fake form

            // Get the value of the selected radio button
            const selectedValue = (userFlairDialog.querySelector('input[name="userFlair"]:checked') as HTMLInputElement)?.value;
    
            userFlairDialog.close(selectedValue); // Send the selected value here.
    
            const flair = userFlairDialog.returnValue;
            if (flair !== 'cancel' && flair !== 'default') {
              const pickedFlair = flairs.find(f => f.id === flair) as unknown as UserFlair;
              
              this.props.onUserFlairUpdate(pickedFlair)
              setUserFlair(pickedFlair);
            }
        });
        
        removeFlairBtn.addEventListener("click", (event) => {
            event.preventDefault(); // We don't want to submit this fake form
            
            // Uncheck the checked radio button
            const checkedRadioButton = userFlairDialog.querySelector('input[name="userFlair"]:checked') as HTMLInputElement;
            if (checkedRadioButton) {
                checkedRadioButton.checked = false;
            }

            userFlairDialog.close(); // Send the selected value here.
    
            this.props.onUserFlairUpdate(null)
            clearUserFlair();
        });
    }

    render() {
    return (
        <dialog id="userFlairDialog" class="bg-light text-dark rounded" style="border-width: 1px;">
            <form>

            <div class="d-flex justify-content-between mb-4">
            <h5>Pick your flair:</h5>
            <button class="btn btn-outline-dark btn-sm rounded-circle" value="cancel" formMethod="dialog">
                <Icon icon="x" classes="icon-inline fs-6" />
            </button>
            </div>
         
            <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));column-gap: 1rem;row-gap: 0.25rem;" class="w-100">
                {flairs.map(flair => (
                    <span>
                        <input type="radio" name="userFlair" value={flair.id} class="me-2" id={"userFlair"+flair.id}/>
                        <label htmlFor={"userFlair"+flair.id}>
                            {flair.image.length > 0 && (<img src={flair.image} style="height:1rem;" class="me-2"/>)}
                            <span>{flair.name}</span>
                        </label>
                    </span>
                ))}
            </div>
               
            <div style="display:grid;grid-template-columns: repeat(3, minmax(0, 1fr));column-gap: 1rem;">
                <div/>
                <button class="btn btn-outline-dark" id="removeFlairBtn" value="default">Remove flair</button>
                <button class="btn btn-dark" id="confirmFlairBtn" value="cancel" formMethod="dialog">Confirm</button>
            </div>
            </form>
        </dialog>
    );
  }
}