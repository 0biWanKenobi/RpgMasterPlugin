import { Signal } from "@preact/signals";
import {App, ButtonComponent, Modal, Notice, setIcon, Setting, SettingGroup} from "obsidian";
import { CampaignSettings } from "./interfaces";
import { PluginSetting, TextPluginSetting } from 'rpg_shared/settings/plugin'



export const initCampaignIdSetting = (
    setting: Setting,
    value: string
) => {
    // noinspection SpellCheckingInspection -- fix "cmpgn" in the placeholder

	var textSetting = TextPluginSetting.build(
		setting,
		'Campaign ID',
		'This will download the campaign info. Your DM can find it in their campaign settings.',
		value
	);

	textSetting.text.setPlaceholder('rpg_cmpgn_id_4c58112a-f325-4397-b5b7-db137ef42414')

	return textSetting;
}

export const initCampaignNameSetting = (
    setting: Setting,
    value: string
) => {

	return TextPluginSetting.build(
		setting,
		'Campaign Name',
		'Name of this awesome campaign',
		value
	);
}


type CampaignOnClickCallback = (cmpgnId: string, cmpgnName: string) => Promise<void>;
type CampaignAddPluginSetting = {
	subscribe:	PluginSetting<string>['subscribe'],
	setting: Setting,
	signal: Signal<string>,
	onAddClicked: (callback: CampaignOnClickCallback) => CampaignAddPluginSetting 
};
export class AddCampaignModal extends Modal {
	
	public readonly content: CampaignAddPluginSetting;
	
	constructor(app: App) {
		super(app);
		this.setTitle('Add Campaign');
		this.content = initAddCampaignOption(this.contentEl);
	}
}

export class RemoveCampaignModal extends Modal {
	private confirmed = false; 
	
	private responseResolver = Promise.withResolvers<boolean>();
	
	constructor(app: App) {
		super(app);
		this.setTitle('Remove Campaign?');
		
		const btnContainer = this.contentEl.createEl('div', { cls: 'delete-dm-modal-buttons' })
		
		new	ButtonComponent(btnContainer)
					.setButtonText('Yes')
					.setWarning()
					.onClick(() => {
						this.confirmed = true;
						this.close();
					});
		new	ButtonComponent(btnContainer)
			.setButtonText('No')
			.onClick(() => this.close());
	}
	
	onOpen(): Promise<void> | void {
		this.confirmed = false;
		return super.onOpen();
	}

	onClose() {
		this.responseResolver.resolve(this.confirmed);
		super.onClose();
	}

	waitResponse() {
		super.open();
		return this.responseResolver.promise;
	}
}


export const initAddCampaignOption = (
	containerEl: HTMLElement,
)=> {

	let campaignNameInput: PluginSetting<string>;
	let button: ButtonComponent;

	new SettingGroup(containerEl)
		.addSetting( s => campaignNameInput = initCampaignNameSetting(s, ''))
		.addSetting( s => {
			s.addButton(btn => {
				btn.setButtonText('Create')
				button = btn;
			})
		})

	const setting: CampaignAddPluginSetting = {
		...campaignNameInput!,
		subscribe: campaignNameInput!.subscribe,
		onAddClicked: (callback: CampaignOnClickCallback) => {
			button.onClick(async () => {				
				new Notice('Campaign created!')
				const campaignId = `rpg_cmpgn_id_${crypto.randomUUID()}`;
				await callback(campaignId, campaignNameInput!.signal.value)	
			});
			return setting
		}
	}
	return setting;
}

type CampaignGalleryItem = {
	id: string,
	item: HTMLElement,
	icon: HTMLElement
}

export const initCampaignGalleryItem = (
	parent: HTMLElement,
	setting: CampaignSettings
) => {
	const dmEl = parent.createEl(
		'div',
		{cls: 'plugin-settings-campaign-gallery-item', attr: {'data-campaign-id': setting.id}},
	)
	dmEl.createEl('div', {text: setting.name, cls: 'plugin-settings-campaign-gallery-item-name'})
	const iconDiv = dmEl.createEl('div', {cls: 'icon'});

	setIcon(iconDiv, 'trash-2')
	if(setting.image) {
		dmEl.createEl('div', {cls: 'plugin-settings-campaign-gallery-item-avatar'})
	}
	
	return <CampaignGalleryItem>{
		id: setting.id,
		item: dmEl,
		icon: iconDiv,
	}
}