import { App, PluginSettingTab } from "obsidian";
import { Component, ComponentProps, mount, unmount } from "svelte";
import type RPGDungeonMasterPlugin from "./rpgMasterMain";
import { MASTER_PLUGIN } from "./capability";
import AppComponent from "./components/main.svelte";
import { setAppContext } from "./context.svelte";

type AppProps = ComponentProps<typeof AppComponent>;


class SettingTab extends PluginSettingTab {
	#plugin: RPGDungeonMasterPlugin;

	#mountedSvelte: object[] = [];

	constructor(app: App, plugin: RPGDungeonMasterPlugin) {
		super(app, plugin);
		this.#plugin = plugin;		
		Object.seal(this);
	}

	#ContextCreator: Component<AppProps> = (internals, props) => {
		setAppContext({
			plugin: this.#plugin,
			settings: this.#plugin.getSettings(MASTER_PLUGIN),
		});

		return AppComponent(internals, props);
	};

	display(): void {
		this.#cleanupSvelte();
		const { containerEl } = this;
		containerEl.empty();

		this.#mountedSvelte.push(
			mount(this.#ContextCreator, {
				target: containerEl,
			}),
		);
	}

	#cleanupSvelte() {
		for (const component of this.#mountedSvelte) {
			unmount(component);
		}
		this.#mountedSvelte = [];
	}
}

Object.freeze(SettingTab.prototype);

export { SettingTab }
