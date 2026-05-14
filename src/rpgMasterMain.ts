import type { App, PluginManifest } from 'obsidian';
import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type PluginSettings, SettingTab } from './settings';
import './styles.css'
import "rpg_shared/styles.css";
import { signal } from '@preact/signals';
import {
	clearGoogleDriveSetupContext,
	decryptGoogleDrivePayload,
	persistGoogleDriveTokens,
} from './googleDriveProtocol';
import { MASTER_PLUGIN } from './capability';
import { UserPasswordModal } from './settings/userPasswordModal';

type RpgNexusConfiguration = {
	action: string,
	setup_id?: string,
	payload?: string,
}

type TokenStatus = "idle" | "set" | "pwdinput" | "error";

class RPGDungeonMasterPlugin extends Plugin {
	#settings!: PluginSettings;

	tokenStatus = signal<TokenStatus>("idle");

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		Object.seal(this)
	}

	public onTokenSet(callback: (v: TokenStatus) => void, token: typeof MASTER_PLUGIN) {
		if (token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		return this.tokenStatus.subscribe(callback)
	}

	public resetTokenStatus(token: typeof MASTER_PLUGIN) {
		if (token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		this.tokenStatus.value = "idle";
	}

	async onload() {
		console.log('Loading RPG Master Plugin');

		await this.#loadSettings();

		if (!this.#settings || this.#settings.version < RPG_MASTER_PLUGIN_VERSION) {
			// welcome user
		}

		const settingTab = new SettingTab(this.app, this);


		this.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
			void this.#handleRpgNexusConfiguration(params as RpgNexusConfiguration);
		})

		this.addSettingTab(settingTab);

	}

	getSettings(token: typeof MASTER_PLUGIN) {
		if (token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		return this.#settings;
	}

	async #loadSettings() {
		this.#settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings(token: typeof MASTER_PLUGIN) {
		if (token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		await this.saveData(this.#settings);
	}

	async #handleRpgNexusConfiguration(configuration: RpgNexusConfiguration) {

		if (!configuration.setup_id || !configuration.payload) {
			this.tokenStatus.value = "error";
			new Notice("Google token payload missing from callback.")
			return;
		}

		this.tokenStatus.value = "pwdinput";
		const pwdModal = new UserPasswordModal(this.app);
		const password = await pwdModal.waitInput();

		if (!password) { //TODO: check length and complexity
			new Notice("No password set");
			this.tokenStatus.value = "error"
			return;
		}

		try {
			const tokenSet = await decryptGoogleDrivePayload(
				this.app,
				configuration.setup_id,
				configuration.payload,
			);

			this.#settings.gdriveSettings = await persistGoogleDriveTokens(
				this.app,
				this.#settings.gdriveSettings,
				tokenSet,
				password
			);
			clearGoogleDriveSetupContext(this.app, configuration.setup_id);
			await this.saveSettings(MASTER_PLUGIN);
			this.tokenStatus.value = "set";
			new Notice("Google Drive connected")
		} catch (error) {
			this.tokenStatus.value = "error";
			new Notice(
				error instanceof Error
					? `Google token decryption failed: ${error.message}`
					: "Google token decryption failed.",
			)
		}
	}
}

Object.freeze(RPGDungeonMasterPlugin.prototype);

export default RPGDungeonMasterPlugin;
