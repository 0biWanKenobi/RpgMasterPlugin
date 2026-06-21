import { App, PluginSettingTab } from "obsidian";
import { mount, unmount } from "svelte";
import type RPGDungeonMasterPlugin from "./rpgMasterMain";
import { CampaignSettings, DungeonMasterSettings, GDriveSettings } from "./settings/interfaces";
import { initCampaignGalleryItem, RemoveCampaignModal } from "./settings/campaign";
import { MASTER_PLUGIN } from "./capability";
import { DriveSyncSettingTab } from "./settings/driveSync";
import appComponent from "./components/main.svelte";

export interface PluginSettings {
	dungeonMaster: DungeonMasterSettings;
	campaigns: CampaignSettings[];
	gdriveSettings: GDriveSettings;
	playerPeerId: string;
	lastUpdated?: Date;
	version: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	dungeonMaster: {
		id: '',
		name: '',
		lastUpdated: new Date(),
	},
	campaigns: [],
	gdriveSettings: {
		configured: false,
		folderId: '',
		folderPath: '',
		expiresAt: undefined,
		lastUpdated: new Date(),
	},
	playerPeerId: '',
	lastUpdated: undefined,
	version: "1.0.0"
}

class SettingTab extends PluginSettingTab {
	#plugin: RPGDungeonMasterPlugin;

	#mountedSvelte: object[] = [];

	constructor(app: App, plugin: RPGDungeonMasterPlugin) {
		super(app, plugin);
		this.#plugin = plugin;

		Object.seal(this);
	}

	get #pgsettings() {
		return this.#plugin.getSettings(MASTER_PLUGIN)
	}

	display(): void {
		this.#cleanupSvelte();
		const { containerEl } = this;
		containerEl.empty();


		this.#mountedSvelte.push(
			mount(appComponent, {
				target: containerEl,
				props: {
					app: this.app,
					plugin: this.#plugin,
					pgSettings: this.#pgsettings,
				},
			}),
		);


	}

	#cleanupSvelte() {
		for (const component of this.#mountedSvelte) {
			unmount(component);
		}
		this.#mountedSvelte = [];
	}


}

Object.freeze(SettingTab.prototype);

export { SettingTab }
