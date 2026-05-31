import { App } from "obsidian";
import { GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
import { UserPasswordModal } from "rpg_shared/ui/userPasswordModal";
import RPGDungeonMasterPlugin from "../../rpgMasterMain";
import { MASTER_PLUGIN } from "../../capability";
import { persistGoogleDriveTokens } from "../../googleDriveProtocol";

    const getUserPassword = async (app: App) => {
        const pwdModal = new UserPasswordModal(app);
        return await pwdModal.waitInput();
    }

    Object.freeze(getUserPassword.prototype);


    const saveDriveTokens = async (password: string, tokenSet: GoogleDriveTokenSet, plugin: RPGDungeonMasterPlugin) => {
        const pluginSettings = plugin.getSettings(MASTER_PLUGIN);

        pluginSettings.gdriveSettings = await persistGoogleDriveTokens(
            plugin.app,
            pluginSettings.gdriveSettings,
            tokenSet,
            password
        );
        await plugin.saveSettings(MASTER_PLUGIN);
    }

    Object.freeze(saveDriveTokens.prototype)

    export {getUserPassword, saveDriveTokens}