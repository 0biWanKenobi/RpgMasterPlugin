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

type RpgNexusConfiguration = {
	action: string,
	setup_id?: string,
	payload?: string,
}

type TokenStatus = "idle"|"set"|"error";

class RPGDungeonMasterPlugin extends Plugin {
	#settings!: PluginSettings;
	
	#tokenIsSet = signal<TokenStatus>("idle");

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		Object.seal(this)
	}

	public get isTokenSet(){
		return this.#tokenIsSet.value;
	}

	public onTokenSet(callback: (v: TokenStatus) => void){
		return this.#tokenIsSet.subscribe(callback)
	}

	public resetTokenStatus() {
		this.#tokenIsSet.value = "idle";
	}

	async onload() {
		console.log('Loading RPG Master Plugin');
		await this.#loadSettings();

		const settingTab = new SettingTab(this.app, this);


		this.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
			void this.#handleRpgNexusConfiguration(params as RpgNexusConfiguration);
		})

		this.addSettingTab(settingTab);

	}

	getSettings(token: typeof MASTER_PLUGIN){
		if(token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		return this.#settings;
	}

	async #loadSettings() {
		this.#settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.#settings);
	}

	async #handleRpgNexusConfiguration(configuration: RpgNexusConfiguration) {

		if (!configuration.setup_id || !configuration.payload) {
			this.#tokenIsSet.value = "error";
			new Notice("Google token payload missing from callback.")
			return;
		}

		try {
			const tokenSet = await decryptGoogleDrivePayload(
				this.app,
				configuration.setup_id,
				configuration.payload,
			);

			this.#settings.gdriveSettings = persistGoogleDriveTokens(
				this.app,
				this.#settings.gdriveSettings,
				tokenSet,
			);
			clearGoogleDriveSetupContext(this.app, configuration.setup_id);
			await this.saveSettings();
			this.#tokenIsSet.value = "set";
			new Notice("Google Drive connected")
		} catch (error) {
			this.#tokenIsSet.value = "error";
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