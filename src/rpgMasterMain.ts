import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, SettingTab } from './settings';
import './styles.css'
import "rpg_shared/styles.css";
import { effect, signal } from '@preact/signals';

type RpgNexusConfiguration = {
	action: string,
	setup_token: string,
	value: string
}

type TokenStatus = "idle"|"set"|"error";

const RPG_MASTER_G_TOKEN = "rpg-master-g-token"

export default class RPGDungeonMasterPlugin extends Plugin {
	//@ts-ignore
	settings: PluginSettings;
	
	private tokenIsSet = signal<TokenStatus>("idle");
	public get isTokenSet(){
		return this.tokenIsSet.value;
	}

	public onTokenSet(callback: (v: TokenStatus) => void){
		return this.tokenIsSet.subscribe(callback)
	}

	async onload() {
		console.log('Loading RPG Master Plugin');
		await this.loadSettings();

		const settingTab = new SettingTab(this.app, this);


		this.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
			const configuration = params as RpgNexusConfiguration;
			this.app.secretStorage.setSecret(RPG_MASTER_G_TOKEN, configuration.value);
			this.tokenIsSet.value = "set";
			new Notice("Google token registered")
		})

		this.addSettingTab(settingTab);

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
