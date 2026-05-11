import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type RPGDungeonMasterPlugin from "./rpgMasterMain";
import { CampaignSettings, DungeonMasterSettings, GDriveSettings } from "./settings/interfaces";
import { AddCampaignModal, initCampaignGalleryItem, RemoveCampaignModal } from "./settings/campaign";
import { Tabs } from "rpg_shared/ui/tabs";
import { headerWithIcon } from "rpg_shared/ui/headerWithIcon";
import { IconButtonComponent } from "rpg_shared/ui/iconButton";
import { GoogleDriveConnectModal } from "rpg_shared/sync/googleDriveConnectModal"
import {
	clearGoogleDriveSetupContext,
	createGoogleDriveSetupContext,
} from "./googleDriveProtocol";
import { MASTER_PLUGIN } from "./capability";
import { UserPasswordModal } from "./settings/userPasswordModal";

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
		tokenType: '',
		scope: '',
		folderId: '',
		expiresAt: undefined,
		lastUpdated: new Date(),
	},
	playerPeerId: '',
	lastUpdated: undefined,
	version: "1.0.0"
}

class SettingTab extends PluginSettingTab {
	#plugin: RPGDungeonMasterPlugin;

	constructor(app: App, plugin: RPGDungeonMasterPlugin) {
		super(app, plugin);
		this.#plugin = plugin;
		Object.seal(this);
	}

	get #pgsettings (){
		return this.#plugin.getSettings(MASTER_PLUGIN)
	}
	
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		
		new Tabs()
			.addToContainer(containerEl)
			.addTab('Options', () => {
				contentsWrapper.empty();
				this.#displayOptions(contentsWrapper);
			})
			.addTab('GDrive', () => {
				contentsWrapper.empty();
				this.#displayGDriveSettings(contentsWrapper);
			});

		const contentsWrapper = containerEl.createDiv();


		this.#displayOptions(contentsWrapper);
	}


	#displayOptions(containerEl: HTMLElement) {

		headerWithIcon(containerEl, 'You', 'circle-user');

		new Setting(containerEl)
			.addText(text =>
				text.setDisabled(true)
					.setValue(this.#pgsettings.dungeonMaster.id)
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

		const addCampaignModal = new AddCampaignModal(this.app);
		addCampaignModal.content.onAddClicked(async (cmpgnId, cmpgnName) => {
			this.#pgsettings.campaigns.push({
				id: cmpgnId,
				name: cmpgnName,
				masterId: '',
				playerCount: 0,
				startDate: new Date(),
				lastUpdated: new Date(),
			});
			await this.#plugin.saveSettings(MASTER_PLUGIN);
			this.display();
			addCampaignModal.close();
		});

		new Setting(containerEl)
			.addButton(btn => {
				btn.setButtonText('Add new campaign')
					.onClick(() => addCampaignModal.open())
			})

	}

	#displayGDriveSettings(containerEl: HTMLElement) {
		if (!this.#pgsettings.gdriveSettings.configured) {
			headerWithIcon(containerEl, 'Google Drive not configured', 'cloud-off');

			new IconButtonComponent(containerEl)
				.setButtonText('Connect Google Drive')
				.addIcon('cloud')
				.onClick(async () => {

					const pwdModal = new UserPasswordModal(this.app);
					const password = await pwdModal.waitResponse();
				});

			return;
		}

		headerWithIcon(containerEl, 'Google Drive connected', 'cloud');

		new Setting(containerEl)
			.setName('Connection status')
			.setDesc(`Connected. Access token expires ${this.#describeAccessTokenExpiry()}.`)
			.addButton((btn) => {
				btn.setButtonText('Reconnect')
					.onClick(() => this.#onConnect(this.app));
			});	
		}

	async #onConnect(app: App){
		this.#plugin.resetTokenStatus(MASTER_PLUGIN);

		const setupContext = createGoogleDriveSetupContext(
			app,
			import.meta.env.VITE_GAUTH_URL,
		);


		const pwdModal = new UserPasswordModal(app);
		const password = await pwdModal.waitInput();

		if(!password) { //TODO: check length and complexity
			new Notice("No password set");
			return;
		}

		this.#plugin.setPassword(password, MASTER_PLUGIN);

		const gdriveAuthModal = new GoogleDriveConnectModal(app);
		const cancelled = gdriveAuthModal.openAsync(setupContext.authUrl);

		const stopListening = this.#plugin.onTokenSet((set) => {
			if(set == "set"){
				new Notice("Token saved")
				gdriveAuthModal.setStatus("Operation completed, you can close this window", "check-check");
				gdriveAuthModal.setButtonsAfterLogin();
			}
			else if(set == "error") {
				new Notice("Error: token not saved")
				gdriveAuthModal.setStatus("Something went wrong, close this window and try again.", "circle-x")
			}
		}, MASTER_PLUGIN)

		if(await cancelled) {
			clearGoogleDriveSetupContext(app, setupContext.setupId);
			new Notice("Setup cancelled")
		}
		
		stopListening();

		await this.#plugin.saveSettings(MASTER_PLUGIN);
		this.display();
	}

	#describeAccessTokenExpiry() {
		const expiresAt = this.#pgsettings.gdriveSettings.expiresAt;
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

Object.freeze(SettingTab.prototype);

export {SettingTab}