import type { App, ObsidianProtocolHandler, PluginManifest } from 'obsidian';
import { Plugin } from 'obsidian';
import { SettingTab } from './settingsTab';
import './styles.css'
import "rpg_shared/styles.css";
import { MASTER_PLUGIN } from './utils/capability';
import { createSettingsState, DEFAULT_SETTINGS, snapshotSettings } from './settingState.svelte';
import { type PluginSettings } from './utils/interfaces';

class RPGDungeonMasterPlugin extends Plugin {
	#settings!: PluginSettings;
	#handlerRegistered = false;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		Object.seal(this)
	}

	async onload() {
		console.debug('Loading RPG Master Plugin');

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
		const loaded = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
		this.#settings = createSettingsState(loaded);
	}

	async saveSettings(token: typeof MASTER_PLUGIN) {
		if (token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		await this.saveData(snapshotSettings(this.#settings));
	}

	registerObsidianProtocolHandler(action: string, handler: ObsidianProtocolHandler): void {
		if(this.#handlerRegistered) return;
		super.registerObsidianProtocolHandler(action, handler)
		this.#handlerRegistered = true;
	}
}

Object.freeze(RPGDungeonMasterPlugin.prototype);

export default RPGDungeonMasterPlugin;
