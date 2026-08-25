import type { App, ObsidianProtocolHandler, PluginManifest } from 'obsidian';
import { MarkdownView, Platform, Plugin } from 'obsidian';
import { SettingTab } from './settingsTab';
import './styles.css'
import { MASTER_PLUGIN } from './utils/capability';
import { createSettingsState, DEFAULT_SETTINGS, snapshotSettings } from './settingState.svelte';
import { type PluginSettings } from './utils/interfaces';
import { mount, unmount } from 'svelte';
import { setAppContext } from './context.svelte';
import SyncStatusBarIcon, { SyncStatusBarIconProps } from './components/drivesync/SyncStatusBarIcon.svelte';
import { addTopViewIcon, RPG_SYNC_CLASS } from './utils/driveSync/syncUI';
import { configureContextMenu } from './utils/contextMenu/fileTreeActions';
import { refreshCampaignDecorations } from './utils/contextMenu/fileTreeDecoration';
import { CampaignRegistry } from './utils/registry/campaignRegistry.svelte';
import SqliteSmokeWorker from "./utils/db/sqlite-smoke.worker?worker&inline";


class RPGDungeonMasterPlugin extends Plugin {
	#settings!: PluginSettings;
	#handlerRegistered = false;
	#campaignRegistry!: CampaignRegistry;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		Object.seal(this)

		const worker = new SqliteSmokeWorker();
		worker.onmessage = (event) => {
			console.log("SQLite worker response:", event.data);
		};

		worker.onerror = (event) => {
			console.error("SQLite worker error:", event);
		};

		

		this.runDbTest = (token, command) => {
			worker.postMessage({
				type: command,
			});
		}
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
		this.#configureTopViewIcon();

		configureContextMenu(this);

		refreshCampaignDecorations(this)

		this.#campaignRegistry = CampaignRegistry(this);

	}

	runDbTest: (token: typeof MASTER_PLUGIN, command: string) => void

	getSettings(token: typeof MASTER_PLUGIN) {
		if (token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		return this.#settings;
	}

	#addStatusBarIcon(){
		const statusBarIcon = this.addStatusBarItem();
		statusBarIcon.classList.add('mod-clickable');
		statusBarIcon.setAttr('data-tooltip-position', 'top');
		var svelteInstance = mount(
				(internals, props) => {
					setAppContext({
						plugin: this,
						settings: this.#settings,
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



	#configureTopViewIcon() {

		this.app.workspace.onLayoutReady(() => {
			const view =
				this.app.workspace.getActiveViewOfType(MarkdownView);

			if (!view || view.containerEl.querySelector(`.${RPG_SYNC_CLASS}`) != null) return;
			addTopViewIcon(view, this);
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				const view = leaf?.view;

				if (
					view instanceof MarkdownView &&
					view.containerEl.querySelector(`.${RPG_SYNC_CLASS}`) == null
				) {
					addTopViewIcon(view, this);
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

	getCampaignRegistry(token: typeof MASTER_PLUGIN) {
		if (token !== MASTER_PLUGIN) throw new Error("Unauthorized")
		return this.#campaignRegistry
	}
}

Object.freeze(RPGDungeonMasterPlugin.prototype);

export default RPGDungeonMasterPlugin;
