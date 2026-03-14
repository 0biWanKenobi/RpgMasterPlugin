import { App, PluginSettingTab, setIcon, Setting } from "obsidian";
import type RPGDungeonMasterPlugin from "main";
import {CampaignSettings, DungeonMasterSettings} from "./settings/interfaces";
import { AddCampaignModal, initCampaignGalleryItem, RemoveCampaignModal } from "./settings/campaign";
import P2PService from "./p2p";

export interface PluginSettings {
	dungeonMaster: DungeonMasterSettings;
	campaigns: CampaignSettings[];
	playerPeerId: string;
	lastUpdated?: Date;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	dungeonMaster: {
		id: '',
		name: '',
		lastUpdated: new Date(),
	},
	campaigns: [],
	playerPeerId: '',
	lastUpdated: undefined,	
}

export class SettingTab extends PluginSettingTab {
    plugin: RPGDungeonMasterPlugin;
    private readonly p2pService: P2PService;
    
    constructor(app: App, plugin: RPGDungeonMasterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.p2pService = new P2PService(this.plugin.settings.playerPeerId);
	}
    
    display(): void {
        const {containerEl} = this;
        containerEl.empty();
		// eslint-disable-next-line obsidianmd/settings-tab/no-problematic-settings-headings
        new Setting(containerEl).setName('Options').setHeading().setClass('rpg-settings-title')

        headerWithIcon(containerEl, 'Campaigns', 'scroll-text');
		
		const campaignGallery = containerEl.createEl('div', {cls: 'plugin-settings-campaigns-gallery'})
		
		const removeCampaignModal = new RemoveCampaignModal(this.app);

		for (const campaign of this.plugin.settings.campaigns) {			
			const galleryItem  = initCampaignGalleryItem(campaignGallery, campaign);
			galleryItem.icon.onclick = async () => {
				const shouldRemove = await removeCampaignModal.waitResponse();
				if(!shouldRemove) return;
				const indexToDelete = this.plugin.settings.campaigns
					.findIndex(d => d.id === galleryItem.id);
				this.plugin.settings.campaigns.splice(indexToDelete, 1);
				await this.plugin.saveSettings();
				this.display();
			}
		}

		const addCampaignModal = new AddCampaignModal(this.app);
		addCampaignModal.content.onAddClicked(async (cmpgnId, cmpgnName) => {
			this.plugin.settings.campaigns.push({
				id: cmpgnId,
				name: cmpgnName,
				masterId: '',
				playerCount: 0,
				startDate: new Date(),
				lastUpdated: new Date(),
			});
			await this.plugin.saveSettings();
			this.display();
			addCampaignModal.close();
		});

		new Setting(containerEl)
			.addButton( btn => {
				btn.setButtonText('Add new campaign')
					.onClick(() => addCampaignModal.open())
			})

		// headerWithIcon(containerEl, 'Characters', 'file-user');
		
    }
}

const headerWithIcon = (parent: HTMLElement, title: string, icon: string) => {
	const campaignHeader = new Setting(parent)
	.setName(title)
	.setClass('header-with-icon')
	.setHeading();
	
	setIcon(campaignHeader.settingEl.createDiv({cls: 'header-icon-wrapper'}), icon);

	return campaignHeader;
}