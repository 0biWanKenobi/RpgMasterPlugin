import { headerWithIcon } from "rpg_shared/ui/headerWithIcon";
import { PluginSettings } from "../../settings";
import { Notice, Setting } from "obsidian";
import {
    clearGoogleDriveSetupContext,
    createGoogleDriveSetupContext,
    decryptGoogleDrivePayload,
    GOOGLE_DRIVE_ACCESS_TOKEN_SECRET,
    GOOGLE_DRIVE_REFRESH_TOKEN_SECRET
} from "../../googleDriveProtocol";
import { MASTER_PLUGIN } from "../../capability";
import RPGDungeonMasterPlugin from "../../rpgMasterMain";
import { IconButtonComponent } from "rpg_shared/ui/iconButton";
import { GoogleDriveConnectModal } from "rpg_shared/sync/googleDriveConnectModal";
import { type Signal, signal } from "@preact/signals";
import { UserPasswordModal } from "rpg_shared/ui/userPasswordModal";
import { GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
import { saveDriveTokens } from "./utilities";

type TokenStatus = "idle" | "set" | "pwdinput" | "error";

type RpgNexusConfiguration = {
    action: string,
    setup_id?: string,
    payload?: string,
}

class ConnectionManager {

    #tokenStatus = signal<TokenStatus>("idle");
    #pgsettings: PluginSettings;
    #container: HTMLElement;
    #plugin: RPGDungeonMasterPlugin
    password: string | undefined;

    constructor(container: HTMLElement, signal: Signal<TokenStatus>, plugin: RPGDungeonMasterPlugin) {
        this.#plugin = plugin;
        this.#pgsettings = plugin.getSettings(MASTER_PLUGIN);
        this.#container = container;

        this.#tokenStatus = signal;

        this.#plugin.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
            void this.#onTokenSetReceived(params as RpgNexusConfiguration);
        })

        Object.seal(this);
    }

    get #authExpired() {
        const expiresAt = this.#pgsettings.gdriveSettings.expiresAt;
        if (!expiresAt) return "unknown"
        const remainingMs = expiresAt - Date.now();

        return remainingMs > 10000 ? "no" : "yes"
    }

    get app() {
        return this.#plugin.app;
    }

    display() {
        if (!this.#pgsettings.gdriveSettings.configured) {
            headerWithIcon(this.#container, 'Google Drive not configured', 'cloud-off');

            new IconButtonComponent(this.#container)
                .setButtonText('Connect')
                .addIcon('cloud')
                .onClick(() => this.#onConnect());

            return;
        }

        headerWithIcon(this.#container, 'Google Drive connected', 'cloud');

        new Setting(this.#container)
            .setName('Connection status')
            .setDesc(`Connected. Access token expiration: ${this.#describeAccessTokenExpiry()}.`)
            .addButton((btn) => {
                btn
                    .setIcon("refresh-ccw")
                    .setTooltip('Reconnect')
                    .onClick(() => this.#onConnect());
            })
            .addButton((btn) => {
                btn
                    .setIcon("log-out")
                    .setTooltip("Disconnect")
                    .setWarning()
                    .onClick(() => this.#onDisconnect())
            })
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

    async #onDisconnect() {
        this.app.secretStorage.deleteSecret(GOOGLE_DRIVE_ACCESS_TOKEN_SECRET);
        this.app.secretStorage.deleteSecret(GOOGLE_DRIVE_REFRESH_TOKEN_SECRET);
        this.#pgsettings.gdriveSettings = {
            configured: false,
            folderId: '',
            lastUpdated: new Date(),
            expiresAt: undefined
        }
        this.#plugin.saveSettings(MASTER_PLUGIN)
        this.display();
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

    async #getUserPassword() {
        const pwd = await new UserPasswordModal(this.app).waitInput()
        if (pwd) this.password = pwd;
        return pwd;
    }

    async #saveDriveTokens(password: string, tokenSet: GoogleDriveTokenSet) {
        await saveDriveTokens(password, tokenSet, this.#plugin);
    }

    async #onTokenSetReceived(configuration: RpgNexusConfiguration) {

        if (!configuration.setup_id || !configuration.payload) {
            this.#tokenStatus.value = "error";
            new Notice("Google token payload missing from callback.")
            return;
        }

        this.#tokenStatus.value = "pwdinput";
        this.password = await this.#getUserPassword();

        if (!this.password) { //TODO: check length and complexity
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

            await this.#saveDriveTokens(
                this.password,
                tokenSet,
            );

            clearGoogleDriveSetupContext(this.app, configuration.setup_id);
            await this.#plugin.saveSettings(MASTER_PLUGIN);
            this.#tokenStatus.value = "set";
            new Notice("Google Drive connected")
        } 
        catch (error) {
            this.#tokenStatus.value = "error";
            new Notice(
                error instanceof Error
                    ? `Google token decryption failed: ${error.message}`
                    : "Google token decryption failed.",
            )
        }
    }
}

Object.freeze(ConnectionManager.prototype);

export { ConnectionManager }