import {computed, Signal} from "@preact/signals";
import {App, ButtonComponent, Modal, Notice, setIcon, Setting, SettingGroup} from "obsidian";
import {PluginSetting} from "./index";
import {DungeonMasterSettings} from "./interfaces";

const initDungeonMasterIdSetting = (setting: Setting, value: string) => {
	return PluginSetting.textual(
		setting,
		'Dungeon Master ID',
		'This will enable sending a connection request to your DM, and accessing their campaigns when they accept.',
		value
	);
}

const initDungeonMasterNameSetting = (	setting: Setting, value: string) => {
	return PluginSetting.textual(
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

export class RemoveDungeonMasterModal extends Modal {
	private confirmed = false; 
	
	private responseResolver = Promise.withResolvers<boolean>();
	
	constructor(app: App) {
		super(app);
		this.setTitle('Remove Dungeon Master?');
		
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

type DmAddOnClickCallback = (dmId: string, dmName: string) => Promise<void>;
type DmAddPluginSetting = {
	subscribe:	PluginSetting<string>['subscribe'],
	setting: Setting,
	signal: Signal<string>,
	onAddClicked: (callback: DmAddOnClickCallback) => DmAddPluginSetting 
};

export const initAddDungeonMasterOption = (
	containerEl: HTMLElement,
)=> {

	let dmIdInput: PluginSetting<string>;
	let dmNameInput: PluginSetting<string>;
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
				new Notice('Join Request Sent!')
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
