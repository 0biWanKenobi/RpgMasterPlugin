import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, SettingTab } from './settings';
import './styles.css'
import "rpg_shared/styles.css";

export default class RPGDungeonMasterPlugin extends Plugin {
	settings: PluginSettings;
	

	async onload() {
		console.log('Loading RPG Master Plugin');
		await this.loadSettings();

		const settingTab = new SettingTab(this.app, this);

		this.addSettingTab(settingTab);

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}