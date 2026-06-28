import { App, PluginSettingTab } from "obsidian";
import { Component, ComponentProps, mount, unmount } from "svelte";
import type RPGDungeonMasterPlugin from "./rpgMasterMain";
import { CampaignSettings, DungeonMasterSettings, GDriveSettings } from "./settings/interfaces";
import { MASTER_PLUGIN } from "./capability";
import AppComponent from "./components/main.svelte";
import { setAppContext } from "./context.svelte";

type AppProps = ComponentProps<typeof AppComponent>;
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

	#ContextCreator: Component<AppProps> = (internals, props) => {
		const settingsState = $state(this.#pgsettings)

		setAppContext({
			plugin: this.#plugin,
			settings: settingsState,
		});

		return AppComponent(internals, props);
	};

	display(): void {
		this.#cleanupSvelte();
		const { containerEl } = this;
		containerEl.empty();

		this.#mountedSvelte.push(
			mount(this.#ContextCreator, {
				target: containerEl,
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
