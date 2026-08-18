import { mount, unmount } from "svelte";
import type RPGDungeonMasterPlugin from "../../rpgMasterPlugin";
import { MASTER_PLUGIN } from "../capability";
import FileTreeStyle from "./fileTreeStyle.svelte";

/**
 * Adds a `Campaign` tag to folders to each folder in Obsidian Files Menu that matches with a Campaign. 
 * 
 * Loads `FileTreeStyle` Svelte component, which in turn generates the relevant css.
 *  
 * @param plugin DM plugin, so that we can get a reactive reference to its settings.
 */
export function refreshCampaignDecorations(plugin: RPGDungeonMasterPlugin): void {

    const pluginSettings = plugin.getSettings(MASTER_PLUGIN);
    plugin.app.workspace.onLayoutReady(() => {
        const mountedComponent = mount(
            FileTreeStyle,
            {
                target: document.body,
                props: {
                    settings: pluginSettings
                }
            }
        )
		plugin.register(() => unmount(mountedComponent));                
    })    
}