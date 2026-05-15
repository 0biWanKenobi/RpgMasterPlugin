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
}

Object.freeze(RPGDungeonMasterPlugin.prototype);

export default RPGDungeonMasterPlugin;
