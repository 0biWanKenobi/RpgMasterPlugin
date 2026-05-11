import { App, SecretComponent } from "obsidian";
import { ConfirmModal } from "rpg_shared/ui/confirmModal";

export class UserPasswordModal extends ConfirmModal {

	#responseResolver = Promise.withResolvers<string|undefined>();
    #password: string | undefined;

    constructor(app: App) {
        super(app);
        
        const form = createEl("form", {cls: "pwd_form"});
        const passwordField = new SecretComponent(app, form);

        passwordField.onChange( v => {
            this.#password = v;
        })

        this.contentEl.prepend(form)

		Object.seal(this);
    }

    waitInput(): Promise<string|undefined> {
        return this.#responseResolver.promise;
    }

    onClose(): void {
        this.#responseResolver.resolve(this.#password)
    }
}