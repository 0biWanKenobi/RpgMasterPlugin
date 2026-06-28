import type { App, ObsidianProtocolHandler, PluginManifest } from 'obsidian';
import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type PluginSettings, SettingTab } from './settings.svelte';
import './styles.css'
import "rpg_shared/styles.css";
import { MASTER_PLUGIN } from './capability';

class RPGDungeonMasterPlugin extends Plugin {
	#settings!: PluginSettings;
	#handlerRegistered = false;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		Object.seal(this)
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

	registerObsidianProtocolHandler(action: string, handler: ObsidianProtocolHandler): void {
		if(this.#handlerRegistered) return;
		super.registerObsidianProtocolHandler(action, handler)
		this.#handlerRegistered = true;
	}
}

Object.freeze(RPGDungeonMasterPlugin.prototype);

export default RPGDungeonMasterPlugin;
