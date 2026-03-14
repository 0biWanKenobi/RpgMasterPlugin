import { Signal } from "@preact/signals";
import {App, ButtonComponent, Modal, Notice, setIcon, Setting, SettingGroup} from "obsidian";
import { CampaignSettings } from "./interfaces";
import { PluginSetting, TextPluginSetting } from 'rpg_shared/settings/plugin'
import { ConfirmModal } from 'rpg_shared/ui/confirmModal'

export class RemoveCampaignModal extends ConfirmModal {
	constructor(app: App) {
		super(app);
		this.setTitle('Remove Campaign?');
	}
	
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