import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import RPGDungeonMasterPlugin from "../../rpgMasterMain";
import {
    areTokensStored,
    GOOGLE_DRIVE_ACCESS_TOKEN_SECRET,
    GOOGLE_DRIVE_REFRESH_TOKEN_SECRET,
} from "../../googleDriveProtocol";
import { signal } from "@preact/signals";
import { MASTER_PLUGIN } from "../../capability";
import {
    GoogleDriveTokenSet,
    refreshGoogleDriveAccessToken
} from "rpg_shared/sync/googleDriveAuth";
import { IconButtonComponent } from "rpg_shared/ui/iconButton";
import { HeaderWithIcon } from "rpg_shared/ui/headerWithIcon";
import { UserPasswordModal } from "rpg_shared/ui/userPasswordModal";
import { decryptObject } from "rpg_shared/sync/googleDriveTokenCrypto";
import { FolderSelector } from "./folderSelector";
import { ConnectionManager } from "./connectionManager";
import { saveDriveTokens } from "./utilities";


class DriveSyncSettingTab extends PluginSettingTab {

    #plugin: RPGDungeonMasterPlugin;
    #folderStatus = signal<'unset' | 'set' | 'selecting'>('unset');

    #connectionManager: ConnectionManager;

    constructor(container: HTMLElement, app: App, plugin: RPGDungeonMasterPlugin) {
        super(app, plugin);
        this.containerEl = container;
        this.#plugin = plugin;

        this.#connectionManager = new ConnectionManager(this.containerEl, plugin);

        if (this.#authExpired != "no" && areTokensStored(app)) {
            (async () => {
                this.#password ??= await this.#getUserPassword();
                if (!this.#password) {
                    new Notice("Cancelled")
                    return;
                }
                const refreshed = await this.#refreshGoogleAccessToken(this.#password);
                if (refreshed) this.display();
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

        this.#folderStatus.value = this.#pgsettings.gdriveSettings.folderId ? 'set' : 'unset';

        const folderStatusComponent = new HeaderWithIcon(this.containerEl)

        let folderSetting: Setting | undefined;
        let showFoldersBtn: IconButtonComponent;
        this.#folderStatus.subscribe((v) => {
            switch (v) {
                case 'set':
                    folderStatusComponent.setDesc('Character folder selected')
                        .setIcon('folder-heart')
                    folderSetting = new Setting(containerEl)
                        .setName(this.#pgsettings.gdriveSettings.folderPath)
                        .then(c => {
                            c.nameEl.style.backgroundColor = 'var(--background-modifier-hover)'
                            c.nameEl.style.paddingBlock = 'var(--size-4-1)'
                            c.nameEl.style.paddingInline = 'var(--size-4-2)'
                            c.nameEl.style.borderRadius = 'var(--setting-items-radius)'
                        })
                        .addButton(b =>
                            b.setIcon('pencil')
                                .onClick(async () => {
                                    b.buttonEl.hide();
                                    await this.#renderFolderSelection();
                                    b.buttonEl.show()
                                })
                        )

                    break;
                case 'unset':
                    folderStatusComponent.setDesc('Characters folder not selected')
                        .setIcon('folder-x');
                    showFoldersBtn?.buttonEl.show()
                    break;
                case 'selecting':
                    folderStatusComponent.setDesc('Select a folder')
                        .setIcon('folder-heart');
                    folderSetting?.settingEl.hide()
                    break;
            }
        })

        this.#connectionManager.onStatusChange( v => {

            if(v == 'unset' && !areTokensStored(this.app)){
                showFoldersBtn?.buttonEl.hide();
                folderStatusComponent.settingEl.hide()
                return;
            }

            folderStatusComponent.settingEl.show()
            showFoldersBtn ??= new IconButtonComponent(this.containerEl)
                .setButtonText('Select Folder')
                .addIcon('folder-closed')
                .onClick(async () => {
                    showFoldersBtn.buttonEl.hide();
                    const selected = await this.#renderFolderSelection();
                    showFoldersBtn.buttonEl.hidden = !selected;
                });

            showFoldersBtn.buttonEl.toggleVisibility(this.#folderStatus.value == 'unset')
        })
    }

    async #renderFolderSelection() {
        this.#folderStatus.value = 'selecting';
        const selected = await new FolderSelector(this.containerEl)
            .onSelected(async (id, path) => {
                this.#pgsettings.gdriveSettings.folderId = id;
                this.#pgsettings.gdriveSettings.folderPath = path;
                await this.#plugin.saveSettings(MASTER_PLUGIN)
            })
            .display(
                async () => {
                    const pwd = this.#password ?? await this.#getUserPassword();
                    return pwd ? this.#getGoogleAccessToken(pwd) : pwd;
                }
            );
        this.#folderStatus.value = (selected || this.#pgsettings.gdriveSettings.folderId) ? 'set' : 'unset';
        return selected;
    }

    async #saveDriveTokens(password: string, tokenSet: GoogleDriveTokenSet) {
        await saveDriveTokens(password, tokenSet, this.#plugin);
    }

    async #getGoogleAccessToken(password: string) {
        if (this.#authExpired != "no") {
            const success = await this.#refreshGoogleAccessToken(password);
            if(!success) return;
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
        const pwd = this.#password ?? await new UserPasswordModal(this.app).waitInput()
        if (pwd) this.#password = pwd;
        return pwd;
    }
}

Object.freeze(DriveSyncSettingTab.prototype);

export { DriveSyncSettingTab }