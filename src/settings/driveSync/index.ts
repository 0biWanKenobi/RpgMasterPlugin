import { App, Notice, PluginSettingTab } from "obsidian";
import RPGDungeonMasterPlugin from "../../rpgMasterMain";
import {
    areTokensStored,
    GOOGLE_DRIVE_ACCESS_TOKEN_SECRET,
    GOOGLE_DRIVE_REFRESH_TOKEN_SECRET,
    persistGoogleDriveTokens
} from "../../googleDriveProtocol";
import { signal } from "@preact/signals";
import { MASTER_PLUGIN } from "../../capability";
import {
    GoogleDriveTokenSet,
    refreshGoogleDriveAccessToken
} from "rpg_shared/sync/googleDriveAuth";
import { IconButtonComponent } from "rpg_shared/ui/iconButton";
import { headerWithIcon } from "rpg_shared/ui/headerWithIcon";
import { UserPasswordModal } from "rpg_shared/ui/userPasswordModal";
import { decryptObject } from "rpg_shared/sync/googleDriveTokenCrypto";
import { FolderSelector } from "./folderSelector";
import { ConnectionManager } from "./connectionManager";
import { saveDriveTokens } from "./utilities";

type TokenStatus = "idle" | "set" | "pwdinput" | "error";

class DriveSyncSettingTab extends PluginSettingTab {

    #plugin: RPGDungeonMasterPlugin;
    #tokenStatus = signal<TokenStatus>("idle");

    #connectionManager: ConnectionManager;

    constructor(container: HTMLElement, app: App, plugin: RPGDungeonMasterPlugin) {
        super(app, plugin);
        this.containerEl = container;
        this.#plugin = plugin;

        this.#connectionManager = new ConnectionManager(this.containerEl, this.#tokenStatus, plugin);

        if (this.#authExpired != "no" && areTokensStored(app)) {
            (async () => {
                this.#password ??= await this.#getUserPassword();
                if (!this.#password) {
                    new Notice("Cancelled")
                    return;
                }
                const refreshed = await this.#refreshGoogleAccessToken(this.#password);
                if(refreshed) this.display();
            })()
        }

        Object.seal(this);
    }

    get #password() {
        return this.#connectionManager.password
    }

    set #password(v: string | undefined) {
        this.#connectionManager.password = v
    }

    get #pgsettings() {
        return this.#plugin.getSettings(MASTER_PLUGIN)
    }

    get #authExpired() {
        const expiresAt = this.#pgsettings.gdriveSettings.expiresAt;
        if (!expiresAt) return "unknown"
        const remainingMs = expiresAt - Date.now();

        return remainingMs > 10000 ? "no" : "yes"
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        this.#connectionManager.display();

        if (this.#authExpired != "no" && !areTokensStored(this.app)) return;

        if (!this.#pgsettings.gdriveSettings.folderId) {
            headerWithIcon(this.containerEl, 'Characters folder not selected', 'folder-x');

            new IconButtonComponent(this.containerEl)
                .setButtonText('Select Folder')
                .addIcon('folder-closed')
                .onClick(
                    async () =>
                        await new FolderSelector(this.containerEl).display(

                            async () => {
                                const pwd = await this.#getUserPassword();
                                return pwd ? this.#getGoogleAccessToken(pwd) : pwd;
                            }
                        )
                );
        }
    }


    async #saveDriveTokens(password: string, tokenSet: GoogleDriveTokenSet) {
        await saveDriveTokens(password, tokenSet, this.#plugin);
    }

    async #getGoogleAccessToken(password: string) {
        if (this.#authExpired != "no") {
            await this.#refreshGoogleAccessToken(password);
        }

        const encryptedAccessToken = this.app.secretStorage.getSecret(GOOGLE_DRIVE_ACCESS_TOKEN_SECRET) ?? "";
        return await decryptObject<string>(
            password, encryptedAccessToken
        );
    }

    async #refreshGoogleAccessToken(password: string): Promise<boolean> {
        const refreshToken: string = await decryptObject(password, this.app.secretStorage.getSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET) ?? "")

        if (!refreshToken) {
            new Notice("Invalid password!")
            return false;
        }
        const tokenSet = await refreshGoogleDriveAccessToken(
            import.meta.env.VITE_GAUTH_URL,
            refreshToken
        )
        if (!tokenSet.success) {
            new Notice("Cannot authenticate");
            return false;
        }

        await this.#saveDriveTokens(
            password,
            {
                accessToken: tokenSet.access_token,
                refreshToken,
                expiresAt: tokenSet.expiresAt
            },
        );

        return true;
    }

    async #getUserPassword() {
        const pwd = await new UserPasswordModal(this.app).waitInput()
        if (pwd) this.#password = pwd;
        return pwd;
    }
}

Object.freeze(DriveSyncSettingTab.prototype);

export { DriveSyncSettingTab }