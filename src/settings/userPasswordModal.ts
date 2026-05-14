import { App, Setting } from "obsidian";
import { ConfirmModal } from "rpg_shared/ui/confirmModal";
import "./usePasswordModal.css";

export class UserPasswordModal extends ConfirmModal {

    #responseResolver = Promise.withResolvers<string | undefined>();
    #password: string | undefined;

    constructor(app: App) {
        super(app);

        const form = createEl("form", { cls: "pwd_form" });
        new Setting(form)
            .setName("Protect your Google account with a password")
            .addText(t => {
                t.inputEl.setAttr("type", "password");
                t.onChange(v => {
                    this.#password = v
                })
            })

        this.contentEl.prepend(form)

        Object.seal(this);
    }

    waitInput(): Promise<string | undefined> {
        this.open();
        return this.#responseResolver.promise;
    }

    onClose(): void {
        this.#responseResolver.resolve(this.#password)
    }
}