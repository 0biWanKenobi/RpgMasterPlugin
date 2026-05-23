import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import RPGDungeonMasterPlugin from "../rpgMasterMain";
import {
    clearGoogleDriveSetupContext,
    createGoogleDriveSetupContext,
    decryptGoogleDrivePayload,
    GOOGLE_DRIVE_ACCESS_TOKEN_SECRET,
    GOOGLE_DRIVE_REFRESH_TOKEN_SECRET,
    listFoldersIn,
    persistGoogleDriveTokens
} from "../googleDriveProtocol";
import { signal } from "@preact/signals";
import { MASTER_PLUGIN } from "../capability";
import {
    GoogleDriveTokenSet,
    refreshGoogleDriveAccessToken
} from "rpg_shared/sync/googleDriveAuth";
import { IconButtonComponent } from "rpg_shared/ui/iconButton";
import { headerWithIcon } from "rpg_shared/ui/headerWithIcon";
import { UserPasswordModal } from "rpg_shared/ui/userPasswordModal";
import { GoogleDriveConnectModal } from "rpg_shared/sync/googleDriveConnectModal";
import { decryptObject } from "rpg_shared/sync/googleDriveTokenCrypto";

type TokenStatus = "idle" | "set" | "pwdinput" | "error";

type RpgNexusConfiguration = {
    action: string,
    setup_id?: string,
    payload?: string,
}

class DriveSyncSettingTab extends PluginSettingTab {

    #plugin: RPGDungeonMasterPlugin;
    #tokenStatus = signal<TokenStatus>("idle");

    constructor(app: App, plugin: RPGDungeonMasterPlugin, containerEl: HTMLElement) {
        super(app, plugin);
        this.#plugin = plugin;
        this.containerEl = containerEl;

        this.#plugin.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
            void this.#onTokenSetReceived(params as RpgNexusConfiguration);
        })

        Object.seal(this);
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

    draw(containerEl: HTMLElement) {
        this.containerEl = containerEl;
        this.display();
    }

    display() {
        if (!this.#pgsettings.gdriveSettings.configured) {
            headerWithIcon(this.containerEl, 'Google Drive not configured', 'cloud-off');

            new IconButtonComponent(this.containerEl)
                .setButtonText('Connect Google Drive')
                .addIcon('cloud')
                .onClick(() => this.#onConnect());

            return;
        }

        headerWithIcon(this.containerEl, 'Google Drive connected', 'cloud');

        new Setting(this.containerEl)
            .setName('Connection status')
            .setDesc(`Connected. Access token expiration: ${this.#describeAccessTokenExpiry()}.`)
            .addButton((btn) => {
                btn.setButtonText('Reconnect')
                    .onClick(() => this.#onConnect());
            });

        if (!this.#pgsettings.gdriveSettings.folderId) {
            headerWithIcon(this.containerEl, 'Characters folder not selected', 'folder-x');

            new IconButtonComponent(this.containerEl)
                .setButtonText('Select Folder')
                .addIcon('folder-closed')
                .onClick(() => this.#onSelectCharactersFolder());

        }
    }

    async #onConnect() {
        this.#tokenStatus.value = 'idle';

        const setupContext = createGoogleDriveSetupContext(
            this.app,
            import.meta.env.VITE_GAUTH_URL,
        );

        const gdriveAuthModal = new GoogleDriveConnectModal(this.app);
        const cancelled = gdriveAuthModal.openAsync(setupContext.authUrl);

        const stopListening = this.#tokenStatus.subscribe((set) => {

            if (set == "pwdinput") {
                gdriveAuthModal.modalEl.hide();
            }

            else if (set == "set") {
                gdriveAuthModal.modalEl.show();
                new Notice("Token saved")
                gdriveAuthModal.setStatus("Operation completed, you can close this window", "check-check");
                gdriveAuthModal.setButtonsAfterLogin();
            }
            else if (set == "error") {
                gdriveAuthModal.modalEl.show();
                new Notice("Error: token not saved")
                gdriveAuthModal.setStatus("Something went wrong, close this window and try again.", "circle-x")
            }
        })

        if (await cancelled) {
            clearGoogleDriveSetupContext(this.app, setupContext.setupId);
            new Notice("Setup cancelled")
        }

        stopListening();

        await this.#plugin.saveSettings(MASTER_PLUGIN);
        this.display();
    }

    async #onTokenSetReceived(configuration: RpgNexusConfiguration) {

        if (!configuration.setup_id || !configuration.payload) {
            this.#tokenStatus.value = "error";
            new Notice("Google token payload missing from callback.")
            return;
        }

        this.#tokenStatus.value = "pwdinput";
        const pwdModal = new UserPasswordModal(this.app);
        const password = await pwdModal.waitInput();

        if (!password) { //TODO: check length and complexity
            new Notice("No password set");
            this.#tokenStatus.value = "error"
            return;
        }

        try {
            const tokenSet = await decryptGoogleDrivePayload(
                this.app,
                configuration.setup_id,
                configuration.payload,
            );

            await this.#updateDriveTokens(
                password,
                tokenSet,
            );

            clearGoogleDriveSetupContext(this.app, configuration.setup_id);
            await this.#plugin.saveSettings(MASTER_PLUGIN);
            this.#tokenStatus.value = "set";
            new Notice("Google Drive connected")
        } catch (error) {
            this.#tokenStatus.value = "error";
            new Notice(
                error instanceof Error
                    ? `Google token decryption failed: ${error.message}`
                    : "Google token decryption failed.",
            )
        }
    }

    #describeAccessTokenExpiry() {
        if (this.#authExpired == "unknown") {
            return "unknown";
        }

        if (this.#authExpired == "yes") {
            return "expired";
        }

        const expiresAt = this.#pgsettings.gdriveSettings.expiresAt!;
        const remainingMs = expiresAt - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60_000);
        return `in about ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
    }

    async #updateDriveTokens(password: string, tokenSet: GoogleDriveTokenSet) {
        const pluginSettings = this.#plugin.getSettings(MASTER_PLUGIN);

        pluginSettings.gdriveSettings = await persistGoogleDriveTokens(
            this.app,
            pluginSettings.gdriveSettings,
            tokenSet,
            password
        );
        await this.#plugin.saveSettings(MASTER_PLUGIN);
    }

    async #onSelectCharactersFolder() {

        const pwdModal = new UserPasswordModal(this.app);
        const password = await pwdModal.waitInput();

        if (!password) {
            new Notice("Cancelled")
            return;
        }

        if (this.#authExpired != "no") {
            const refreshToken: string = await decryptObject(password, this.app.secretStorage.getSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET) ?? "")

            if (!refreshToken) {
                new Notice("Invalid password!")
                return;
            }
            const tokenSet = await refreshGoogleDriveAccessToken(
                import.meta.env.VITE_GAUTH_URL,
                refreshToken
            )
            if (!tokenSet.success) {
                new Notice("Cannot authenticate");
                return;
            }

            await this.#updateDriveTokens(
                password,
                {
                    accessToken: tokenSet.access_token,
                    refreshToken,
                    expiresAt: tokenSet.expiresAt
                },
            );
        }

        const encryptedAccessToken = this.app.secretStorage.getSecret(GOOGLE_DRIVE_ACCESS_TOKEN_SECRET) ?? "";
        const accessToken = await decryptObject<string>(
            password, encryptedAccessToken
        );

        const folders = await listFoldersIn({
            accessToken,
            rootFolderId: "root"
        })

        const root = this.containerEl.createDiv("folders")

        for (const folder of folders) {
            root.createDiv("folder", el => {
                el.textContent = folder.name
            })
        }
    }
}

Object.freeze(DriveSyncSettingTab.prototype);

export { DriveSyncSettingTab }