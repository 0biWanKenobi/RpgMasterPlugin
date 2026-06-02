import { HeaderWithIcon } from "rpg_shared/ui/headerWithIcon";
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
import { batch, signal, type Signal } from "@preact/signals";
import { UserPasswordModal } from "rpg_shared/ui/userPasswordModal";
import { GoogleDriveTokenSet } from "rpg_shared/sync/googleDriveAuth";
import { saveDriveTokens } from "./utilities";


export type TokenSetup = "idle" | "complete" | "pwdinput" | "error";
export type TokenStatus = "set" | "unset";

type RpgNexusConfiguration = {
    action: string,
    setup_id?: string,
    payload?: string,
}

class ConnectionManager {

    #tokenSetup: Signal<TokenSetup>;
    #tokenStatus: Signal<TokenStatus>;
    #tokenStatusUnsubscribe: undefined |(() => void);
    #pgsettings: PluginSettings;
    #container: HTMLElement;
    #root: HTMLElement | undefined
    #plugin: RPGDungeonMasterPlugin
    password: string | undefined;

    constructor(container: HTMLElement, plugin: RPGDungeonMasterPlugin) {
        this.#plugin = plugin;
        this.#pgsettings = plugin.getSettings(MASTER_PLUGIN);        
        this.#container = container

        this.#tokenSetup = signal("idle");
        this.#tokenStatus = signal(this.#pgsettings.gdriveSettings.configured? 'set' : 'unset')

        this.#plugin.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
            void this.#onTokenSetReceived(params as RpgNexusConfiguration);
        })

        Object.seal(this);
    }

    
    get app() {
        return this.#plugin.app;
    }
    
    get #authExpired() {
        const expiresAt = this.#pgsettings.gdriveSettings.expiresAt;
        if (!expiresAt) return "unknown"
        const remainingMs = expiresAt - Date.now();

        return remainingMs > 10000 ? "no" : "yes"
    }


    display() {

        this.#tokenStatusUnsubscribe ??= this.#tokenStatus.subscribe(v => {
            this.#root ??= this.#container.createDiv({cls: 'connection-manager'});
            this.#root.empty();

            if(v == 'set')
                this.#displayConnected(this.#root);
            else if(v == 'unset')
                this.#displayDisconnected(this.#root)            
        })
    }

    onStatusChange(callback: (v: TokenStatus) => void){
        return this.#tokenStatus.subscribe(callback)
    }

    #displayDisconnected(root: HTMLElement) {
        new HeaderWithIcon(root).setDesc('Google Drive not configured').setIcon('cloud-off');

        new IconButtonComponent(root)
            .setButtonText('Connect')
            .addIcon('cloud')
            .onClick(() => this.#onConnect());
    }

    #displayConnected(root: HTMLElement){
        new HeaderWithIcon(root)
            .setDesc('Google Drive connected')
            .setIcon('cloud');

        new Setting(root)
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
            folderPath: '',
            lastUpdated: new Date(),
            expiresAt: undefined
        }
        this.#plugin.saveSettings(MASTER_PLUGIN)
        this.#tokenStatus.value = 'unset';
    }

    async #onConnect() {
        batch(() => {
            this.#tokenSetup.value = 'idle';
            this.#tokenStatus.value = 'unset';
        })

        const setupContext = createGoogleDriveSetupContext(
            this.app,
            import.meta.env.VITE_GAUTH_URL,
        );

        const gdriveAuthModal = new GoogleDriveConnectModal(this.app);
        const cancelled = gdriveAuthModal.openAsync(setupContext.authUrl);

        const stopListening = this.#tokenSetup.subscribe((status) => {

            if (status == "pwdinput") {
                gdriveAuthModal.modalEl.hide();
            }

            else if (status == "complete") {
                gdriveAuthModal.modalEl.show();
                new Notice("Token saved")
                gdriveAuthModal.setStatus("Operation completed, you can close this window", "check-check");
                gdriveAuthModal.setButtonsAfterLogin();                
            }
            else if (status == "error") {
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
        this.#tokenStatus.value = this.#pgsettings.gdriveSettings.configured? 'set' : 'unset';
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
            this.#tokenSetup.value = "error";
            new Notice("Google token payload missing from callback.")
            return;
        }

        this.#tokenSetup.value = "pwdinput";
        this.password = await this.#getUserPassword();

        if (!this.password) { //TODO: check length and complexity
            new Notice("No password set");
            this.#tokenSetup.value = "error"
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
            this.#tokenSetup.value = "complete";
            new Notice("Google Drive connected")
        } 
        catch (error) {
            this.#tokenSetup.value = "error";
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