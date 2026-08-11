import { GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
import RPGDungeonMasterPlugin from "../../rpgMasterPlugin";
import { MASTER_PLUGIN } from "../capability";
import { persistGoogleDriveTokens } from "../googleDriveProtocol";



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

    export {saveDriveTokens}