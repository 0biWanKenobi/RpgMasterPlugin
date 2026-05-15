import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type RPGDungeonMasterPlugin from "./rpgMasterMain";
import { CampaignSettings, DungeonMasterSettings, GDriveSettings } from "./settings/interfaces";
import { AddCampaignModal, initCampaignGalleryItem, RemoveCampaignModal } from "./settings/campaign";
import { Tabs, headerWithIcon, IconButtonComponent, UserPasswordModal } from "rpg_shared/ui";
import { GoogleDriveConnectModal } from "rpg_shared/sync"
import {
	clearGoogleDriveSetupContext,
	createGoogleDriveSetupContext,
	decryptGoogleDrivePayload,
	persistGoogleDriveTokens,
} from "./googleDriveProtocol";
import { MASTER_PLUGIN } from "./capability";
import { signal } from "@preact/signals";

type RpgNexusConfiguration = {
	action: string,
	setup_id?: string,
	payload?: string,
}

type TokenStatus = "idle" | "set" | "pwdinput" | "error";

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

	#tokenStatus = signal<TokenStatus>("idle");

	constructor(app: App, plugin: RPGDungeonMasterPlugin) {
		super(app, plugin);
		this.#plugin = plugin;
		this.#plugin.registerObsidianProtocolHandler("rpg_nexus_configuration", (params) => {
			void this.#onTokenSetReceived(params as RpgNexusConfiguration);
		})
		Object.seal(this);
	}

	get #pgsettings() {
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
				.onClick(() => this.#onConnect());

			return;
		}

		headerWithIcon(containerEl, 'Google Drive connected', 'cloud');

		new Setting(containerEl)
			.setName('Connection status')
			.setDesc(`Connected. Access token expires ${this.#describeAccessTokenExpiry()}.`)
			.addButton((btn) => {
				btn.setButtonText('Reconnect')
					.onClick(() => this.#onConnect());
			});
	}

	async #onConnect() {
		this.#tokenStatus.value = 'idle';

		const setupContext = createGoogleDriveSetupContext(
			this.app,
			import.meta.env.VITE_GAUTH_URL,
		);

		const gdriveAuthModal = new GoogleDriveConnectModal(this.app);
		const cancelled = gdriveAuthModal.openAsync(setupContext.authUrl);

		const stopListening = this.#tokenStatus.subscribe((set) => {

			if (set == "pwdinput") {
				gdriveAuthModal.modalEl.hide();
			}

			else if (set == "set") {
				gdriveAuthModal.modalEl.show();
				new Notice("Token saved")
				gdriveAuthModal.setStatus("Operation completed, you can close this window", "check-check");
				gdriveAuthModal.setButtonsAfterLogin();
			}
			else if (set == "error") {
				gdriveAuthModal.modalEl.show();
				new Notice("Error: token not saved")
				gdriveAuthModal.setStatus("Something went wrong, close this window and try again.", "circle-x")
			}
		})

		if (await cancelled) {
			clearGoogleDriveSetupContext(this.app, setupContext.setupId);
			new Notice("Setup cancelled")
		}

		stopListening();

		await this.#plugin.saveSettings(MASTER_PLUGIN);
		this.display();
	}

	async #onTokenSetReceived(configuration: RpgNexusConfiguration) {

		if (!configuration.setup_id || !configuration.payload) {
			this.#tokenStatus.value = "error";
			new Notice("Google token payload missing from callback.")
			return;
		}

		this.#tokenStatus.value = "pwdinput";
		const pwdModal = new UserPasswordModal(this.app);
		const password = await pwdModal.waitInput();

		if (!password) { //TODO: check length and complexity
			new Notice("No password set");
			this.#tokenStatus.value = "error"
			return;
		}

		try {
			const tokenSet = await decryptGoogleDrivePayload(
				this.app,
				configuration.setup_id,
				configuration.payload,
			);

			const pluginSettings = this.#plugin.getSettings(MASTER_PLUGIN);

			pluginSettings.gdriveSettings = await persistGoogleDriveTokens(
				this.app,
				pluginSettings.gdriveSettings,
				tokenSet,
				password
			);
			clearGoogleDriveSetupContext(this.app, configuration.setup_id);
			await this.#plugin.saveSettings(MASTER_PLUGIN);
			this.#tokenStatus.value = "set";
			new Notice("Google Drive connected")
		} catch (error) {
			this.#tokenStatus.value = "error";
			new Notice(
				error instanceof Error
					? `Google token decryption failed: ${error.message}`
					: "Google token decryption failed.",
			)
		}
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

export { SettingTab }
