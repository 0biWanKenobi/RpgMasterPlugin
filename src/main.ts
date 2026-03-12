import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, SettingTab } from './settings';

// Remember to rename these classes and interfaces!

export default class RPGDungeonMasterPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		console.log('Loading RPG Master Plugin');
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}