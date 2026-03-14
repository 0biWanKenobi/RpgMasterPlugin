import {computed, Signal} from "@preact/signals";
import {App, ButtonComponent, Modal, Notice, setIcon, Setting, SettingGroup} from "obsidian";
import {DungeonMasterSettings} from "./interfaces";
import { TextPluginSetting } from "rpg_shared/settings/plugin";

const initDungeonMasterIdSetting = (setting: Setting, value: string) => {
	return TextPluginSetting.build(
		setting,
		'Dungeon Master ID',
		'This will enable sending a connection request to your DM, and accessing their campaigns when they accept.',
		value
	);
}

const initDungeonMasterNameSetting = (	setting: Setting, value: string) => {
	return TextPluginSetting.build(
		setting,
		'Name',
		'This will show in the list of your DMs, so you can keep track.',
		value	
	);
}

export class AddDungeonMasterModal extends Modal {
	
	public readonly content: DmAddPluginSetting;
	
	constructor(app: App) {
		super(app);
		this.setTitle('Add Dungeon Master');
		this.content = initAddDungeonMasterOption(this.contentEl);
	}
}



type DmAddOnClickCallback = (dmId: string, dmName: string) => Promise<void>;
type DmAddPluginSetting = {
	subscribe:	TextPluginSetting['subscribe'],
	setting: Setting,
	signal: Signal<string>,
	onAddClicked: (callback: DmAddOnClickCallback) => DmAddPluginSetting 
};

export const initAddDungeonMasterOption = (
	containerEl: HTMLElement,
)=> {

	let dmIdInput: TextPluginSetting;
	let dmNameInput: TextPluginSetting;
	let button: ButtonComponent;
	new SettingGroup(containerEl)
		.addSetting((s) => dmIdInput = initDungeonMasterIdSetting(s, ''))
		.addSetting((s) => dmNameInput = initDungeonMasterNameSetting(s, ''))
		.addSetting((s) => {			
				const buttonDisabled = computed(() => !dmIdInput.signal.value)
				const buttonTooltip = computed(() => 
					buttonDisabled.value
						? 'Input a DM Id to send the request'
						: 'Tap to send the request'
				)
				s.addButton( btn => {
					btn.setButtonText('Send request to your DM')
						.setDisabled(buttonDisabled.value)
						.setTooltip(buttonTooltip.value)
					
					buttonDisabled.subscribe(async (isDisabled) => {
						btn.setDisabled(isDisabled).setTooltip(buttonTooltip.value);
					})
					button = btn;					
				})
		})
	
	const returnedObject: DmAddPluginSetting  = {
		...dmIdInput!,
		subscribe: dmIdInput!.subscribe,
		onAddClicked: (callback: DmAddOnClickCallback) => {
			button.onClick(async () => {
				new Notice('Join request sent!')
				await callback(dmIdInput.signal.value, dmNameInput.signal.value);			
			})
			return returnedObject;
		} 
	}
	return returnedObject;
}

type DmGalleryItem = {
	id: string,
	item: HTMLElement,
	icon: HTMLElement
}

export const initDungeonMasterGalleryItem = (
	parent: HTMLElement,
	setting: DungeonMasterSettings
) => {
	const dmEl = parent.createEl(
		'div',
		{cls: 'plugin-settings-dm-gallery-item', attr: {'data-dm-id': setting.id}},
	)
	dmEl.createEl('div', {text: setting.name, cls: 'plugin-settings-dm-gallery-item-name'})
	const iconDiv = dmEl.createEl('div', {cls: 'icon'});

	setIcon(iconDiv, 'trash-2')
	if(setting.image) {
		dmEl.createEl('div', {cls: 'plugin-settings-dm-gallery-item-avatar'})
	}
	
	return <DmGalleryItem>{
		id: setting.id,
		item: dmEl,
		icon: iconDiv,
	}
}
