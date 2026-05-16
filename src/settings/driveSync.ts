import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import RPGDungeonMasterPlugin from "../rpgMasterMain";
import { clearGoogleDriveSetupContext, createGoogleDriveSetupContext, decryptGoogleDrivePayload, persistGoogleDriveTokens } from "../googleDriveProtocol";
import { signal } from "@preact/signals";
import { MASTER_PLUGIN } from "../capability";
import { GoogleDriveConnectModal } from "rpg_shared/sync";
import { headerWithIcon, IconButtonComponent, UserPasswordModal } from "rpg_shared/ui";

type TokenStatus = "idle" | "set" | "pwdinput" | "error";

type RpgNexusConfiguration = {
    action: string,
    setup_id?: string,
    payload?: string,
}

class DriveSyncSettingTab extends PluginSettingTab {

    #app: App;
    #plugin: RPGDungeonMasterPlugin;
    #containerEl: HTMLElement;
    #tokenStatus = signal<TokenStatus>("idle");

    constructor(app: App, plugin: RPGDungeonMasterPlugin, containerEl: HTMLElement) {
        super(app, plugin);
        this.#plugin = plugin;
        this.#app = app;
        this.#containerEl = containerEl;

        this.#plugin.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
            void this.#onTokenSetReceived(params as RpgNexusConfiguration);
        })

        Object.seal(this);
    }

    get #pgsettings() {
        return this.#plugin.getSettings(MASTER_PLUGIN)
    }

    display() {
        if (!this.#pgsettings.gdriveSettings.configured) {
            headerWithIcon(this.#containerEl, 'Google Drive not configured', 'cloud-off');

            new IconButtonComponent(this.#containerEl)
                .setButtonText('Connect Google Drive')
                .addIcon('cloud')
                .onClick(() => this.#onConnect());

            return;
        }

        headerWithIcon(this.#containerEl, 'Google Drive connected', 'cloud');

        new Setting(this.#containerEl)
            .setName('Connection status')
            .setDesc(`Connected. Access token expires ${this.#describeAccessTokenExpiry()}.`)
            .addButton((btn) => {
                btn.setButtonText('Reconnect')
                    .onClick(() => this.#onConnect());
            });

        if (!this.#pgsettings.gdriveSettings.folderId) {
            headerWithIcon(this.#containerEl, 'Characters folder not selected', 'folder-x');

            new IconButtonComponent(this.#containerEl)
                .setButtonText('Select Folder')
                .addIcon('folder-closed')
                .onClick(() => this.#onConnect());

        }
    }

    async #onConnect() {
        this.#tokenStatus.value = 'idle';

        const setupContext = createGoogleDriveSetupContext(
            this.#app,
            import.meta.env.VITE_GAUTH_URL,
        );

        const gdriveAuthModal = new GoogleDriveConnectModal(this.#app);
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
            clearGoogleDriveSetupContext(this.#app, setupContext.setupId);
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
        const pwdModal = new UserPasswordModal(this.#app);
        const password = await pwdModal.waitInput();

        if (!password) { //TODO: check length and complexity
            new Notice("No password set");
            this.#tokenStatus.value = "error"
            return;
        }

        try {
            const tokenSet = await decryptGoogleDrivePayload(
                this.#app,
                configuration.setup_id,
                configuration.payload,
            );

            const pluginSettings = this.#plugin.getSettings(MASTER_PLUGIN);

            pluginSettings.gdriveSettings = await persistGoogleDriveTokens(
                this.#app,
                pluginSettings.gdriveSettings,
                tokenSet,
                password
            );
            clearGoogleDriveSetupContext(this.#app, configuration.setup_id);
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
        const expiresAt = this.#pgsettings.gdriveSettings.expiresAt;
        if (!expiresAt) {
            return "soon";
        }

        const remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
            return "soon";
        }

        const remainingMinutes = Math.ceil(remainingMs / 60_000);
        return `in about ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
    }
}

Object.freeze(DriveSyncSettingTab.prototype);

export { DriveSyncSettingTab }