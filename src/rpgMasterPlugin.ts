import type { App, ObsidianProtocolHandler, PluginManifest } from 'obsidian';
import { MarkdownView, Notice, Platform, Plugin } from 'obsidian';
import { SettingTab } from './settingsTab';
import './styles.css'
import "rpg_shared/styles.css";
import { MASTER_PLUGIN } from './utils/capability';
import { createSettingsState, DEFAULT_SETTINGS, snapshotSettings } from './settingState.svelte';
import { type PluginSettings } from './utils/interfaces';
import { mount, unmount } from 'svelte';
import { setAppContext } from './context.svelte';
import SyncStatusBarIcon, { SyncStatusBarIconProps } from './components/drivesync/SyncStatusBarIcon.svelte';

class RPGDungeonMasterPlugin extends Plugin {
	#settings!: PluginSettings;
	#handlerRegistered = false;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		Object.seal(this)
	}

	async onload() {
		console.debug('Loading RPG Master Plugin');

		await this.#loadSettings();

		if (!this.#settings || this.#settings.version < RPG_MASTER_PLUGIN_VERSION) {
			// welcome user
		}

		const settingTab = new SettingTab(this.app, this);
		this.addSettingTab(settingTab);
		if(Platform.isDesktop) {
			this.#addStatusBarIcon();
		}		
		else {
			this.#configureTopViewIcon();
		}

	}

	getSettings(token: typeof MASTER_PLUGIN) {
		if (token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		return this.#settings;
	}

	#addStatusBarIcon(){
		const statusBarIcon = this.addStatusBarItem();
		statusBarIcon.classList.add('mod-clickable');
		statusBarIcon.setAttr('data-tooltip-position', 'top');
		var svelteInstance =mount(
				(internals, props) => {
					setAppContext({
						plugin: this,
						settings: this.getSettings(MASTER_PLUGIN),
					});
					props.setLabel = (label: string) => {
						statusBarIcon.setAttr('aria-label', label);
					}
					return SyncStatusBarIcon(internals, props as SyncStatusBarIconProps);
				},
				{
					target: statusBarIcon,
				}
			)
		this.register(() => {
			unmount(svelteInstance);
		})
	}

	#RPG_SYNC_CLASS = 'rpg-master-sync'

	#addTopViewIcon(view: MarkdownView) {
		const action = view.addAction(
				"cloud-sync",
				"RPG Sync",
				() => {
					new Notice("RPG Sync clicked");
				},
			);
		action.classList.add(this.#RPG_SYNC_CLASS)
		this.register(() => {
			action.remove();
		});
	}

	#configureTopViewIcon() {

		this.app.workspace.onLayoutReady(() => {
			const view =
				this.app.workspace.getActiveViewOfType(MarkdownView);

			if (!view || view.containerEl.querySelector(`.${this.#RPG_SYNC_CLASS}`) != null) return;
			this.#addTopViewIcon(view);
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				const view = leaf?.view;

				if (
					view instanceof MarkdownView &&
					view.containerEl.querySelector(`.${this.#RPG_SYNC_CLASS}`) == null
				) {
					this.#addTopViewIcon(view);
				}
			}),
		);
	}


	async #loadSettings() {
		const loaded = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
		this.#settings = createSettingsState(loaded);
	}

	async saveSettings(token: typeof MASTER_PLUGIN) {
		if (token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		await this.saveData(snapshotSettings(this.#settings));
	}

	registerObsidianProtocolHandler(action: string, handler: ObsidianProtocolHandler): void {
		if(this.#handlerRegistered) return;
		super.registerObsidianProtocolHandler(action, handler)
		this.#handlerRegistered = true;
	}
}

Object.freeze(RPGDungeonMasterPlugin.prototype);

export default RPGDungeonMasterPlugin;
