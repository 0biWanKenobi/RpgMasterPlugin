import { App } from "obsidian";
import { UserPasswordModal } from "rpg_shared/ui/userPasswordModal";

    const getUserPassword = async (app: App) => {
        const pwdModal = new UserPasswordModal(app);
        return await pwdModal.waitInput();
    }

    Object.freeze(getUserPassword.prototype);

    export {getUserPassword}