import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type RPGDungeonMasterPlugin from "./rpgMasterMain";
import { CampaignSettings, DungeonMasterSettings, GDriveSettings } from "./settings/interfaces";
import { AddCampaignModal, initCampaignGalleryItem, RemoveCampaignModal } from "./settings/campaign";
import { Tabs } from "rpg_shared/ui/tabs";
import { headerWithIcon } from "rpg_shared/ui/headerWithIcon";
import { IconButtonComponent } from "rpg_shared/ui/iconButton";
import { connectGoogleDrive } from "rpg_shared/sync/googleDriveAuth";

export interface PluginSettings {
	dungeonMaster: DungeonMasterSettings;
	campaigns: CampaignSettings[];
	gdriveSettings: GDriveSettings;
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
	gdriveSettings: {
		configured: false,
		accessToken: '',
		refreshToken: '',
		tokenType: '',
		scope: '',
		folderId: '',
		expiresAt: undefined,
		lastUpdated: new Date(),
	},
	playerPeerId: '',
	lastUpdated: undefined,
}

export class SettingTab extends PluginSettingTab {
	plugin: RPGDungeonMasterPlugin;

	private tabs: Tabs;

	constructor(app: App, plugin: RPGDungeonMasterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.tabs = new Tabs();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();


		this.tabs
			.addToContainer(containerEl)
			.addTab('Options', () => {
				contentsWrapper.empty();
				this.displayOptions(contentsWrapper);
			})
			.addTab('GDrive', () => {
				contentsWrapper.empty();
				this.displayGDriveSettings(contentsWrapper);
			});

		const contentsWrapper = containerEl.createDiv();


		this.displayOptions(contentsWrapper);
	}


	private displayOptions(containerEl: HTMLElement) {

		headerWithIcon(containerEl, 'You', 'circle-user');

		new Setting(containerEl)
			.addText(text =>
				text.setDisabled(true)
					.setValue(this.plugin.settings.dungeonMaster.id)
					.setPlaceholder('rpg_mstr_id_4c58112a-f325-4397-b5b7-db137ef42414')
			)
			.setDesc('Your unique id, share it with your players so they can add you.')
			.addButton(btn =>
				btn
					.setIcon('files')
					.setTooltip('Copy ID')
			)


		headerWithIcon(containerEl, 'Campaigns', 'scroll-text');

		const campaignGallery = containerEl.createEl('div', { cls: 'plugin-settings-campaigns-gallery' })

		const removeCampaignModal = new RemoveCampaignModal(this.app);

		for (const campaign of this.plugin.settings.campaigns) {
			const galleryItem = initCampaignGalleryItem(campaignGallery, campaign);
			galleryItem.icon.onclick = async () => {
				const shouldRemove = await removeCampaignModal.waitResponse();
				if (!shouldRemove) return;
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
			.addButton(btn => {
				btn.setButtonText('Add new campaign')
					.onClick(() => addCampaignModal.open())
			})

	}

	private displayGDriveSettings(containerEl: HTMLElement) {
		if (!this.plugin.settings.gdriveSettings.configured) {
			headerWithIcon(containerEl, 'Google Drive not configured', 'cloud-off');

			new IconButtonComponent(containerEl)
				.setButtonText('Connect Google Drive')
				.addIcon('cloud')
				.onClick(() => this.onConnect(this.app));

			return;
		}

		headerWithIcon(containerEl, 'Google Drive connected', 'cloud');

		new Setting(containerEl)
			.setName('Connection status')
			.setDesc(`Connected. Access token expires ${this.describeAccessTokenExpiry()}.`)
			.addButton((btn) => {
				btn.setButtonText('Reconnect')
					.onClick(() => this.onConnect(this.app));
			});	
		}


	private async onConnect(app: App){
		const response = await connectGoogleDrive(
			app,
			import.meta.env.VITE_GAUTH_URL
		);

		const stopListening = this.plugin.onTokenSet((set) => {
			if(set == "set"){
				new Notice("Token saved")
				response.modal.setStatus("Operation completed, you can close this window", "check-check");
				response.modal.setButtonsAfterLogin();
			}
			else if(set == "error") {
				new Notice("Error: token not saved")
				response.modal.setStatus("Something went wrong, close this window and try again.", "circle-x")
			}
		})

		if(await response.cancelled) {
			new Notice("Setup cancelled")
		}
		
		stopListening();

		await this.plugin.saveSettings();
		this.display();
	}

	private describeAccessTokenExpiry() {
		const expiresAt = this.plugin.settings.gdriveSettings.expiresAt;
		if (!expiresAt) {
			return "soon";
		}

		const remainingMs = expiresAt - Date.now();
		if (remainingMs <= 0) {
			return "soon";
		}

		const remainingMinutes = Math.ceil(remainingMs / 60_000);
		return `in about ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
	}
}
