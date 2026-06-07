import { App, PluginSettingTab, Setting } from "obsidian";
import { mount, unmount } from "svelte";
import type RPGDungeonMasterPlugin from "./rpgMasterMain";
import { CampaignSettings, DungeonMasterSettings, GDriveSettings } from "./settings/interfaces";
import { AddCampaignModal, initCampaignGalleryItem, RemoveCampaignModal } from "./settings/campaign";
import { Tabs } from "rpg_shared/ui/tabs";
import { HeaderWithIcon } from "rpg_shared/ui/headerWithIcon";
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

	#driveSyncTab: DriveSyncSettingTab | undefined;
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

		new Tabs()
			.addToContainer(containerEl)
			.addTab('Options', (container) => {
				this.#displayOptions(container);
			})
			.addTab('Google Drive', (container) => {
				this.#driveSyncTab = new DriveSyncSettingTab(container, this.app, this.#plugin)
				this.#driveSyncTab.display();
			});
	}


	#displayOptions(containerEl: HTMLElement) {

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


		// new HeaderWithIcon(containerEl).setDesc('Campaigns').setIcon('scroll-text');

		const campaignGallery = containerEl.createEl('div', { cls: 'plugin-settings-campaigns-gallery' })

		const removeCampaignModal = new RemoveCampaignModal(this.app);

		for (const campaign of this.#pgsettings.campaigns) {
			const galleryItem = initCampaignGalleryItem(campaignGallery, campaign);
			galleryItem.icon.onclick = async () => {
				const shouldRemove = await removeCampaignModal.waitResponse();
				if (!shouldRemove) return;
				const indexToDelete = this.#pgsettings.campaigns
					.findIndex(d => d.id === galleryItem.id);
				this.#pgsettings.campaigns.splice(indexToDelete, 1);
				await this.#plugin.saveSettings(MASTER_PLUGIN);
				this.display();
			}
		}

		// const addCampaignModal = new AddCampaignModal(this.app);
		// addCampaignModal.content.onAddClicked(async (cmpgnId, cmpgnName) => {
		// 	this.#pgsettings.campaigns.push({
		// 		id: cmpgnId,
		// 		name: cmpgnName,
		// 		masterId: '',
		// 		playerCount: 0,
		// 		startDate: new Date(),
		// 		lastUpdated: new Date(),
		// 	});
		// 	await this.#plugin.saveSettings(MASTER_PLUGIN);
		// 	this.display();
		// 	addCampaignModal.close();
		// });

		// new Setting(containerEl)
		// 	.addButton(btn => {
		// 		btn.setButtonText('Add new campaign')
		// 			.onClick(() => addCampaignModal.open())
		// 	})

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
