import { Notice, TFolder } from "obsidian";
import RPGDungeonMasterPlugin from "../../rpgMasterPlugin";
import { MASTER_PLUGIN } from "../capability";
import { CampaignSettings, PluginSettings } from "../interfaces";

async function tagAsCampaign(
    plugin: RPGDungeonMasterPlugin,
    pluginSettings: PluginSettings,
    folderPath: string,
    folderName: string
) {
    
    const campaign: CampaignSettings = {
        id: 'cmpgn_' + window.crypto.randomUUID(),
        vaultPath: folderPath,
        name: folderName,
        masterId: '',
        playerCount: 0,
        lastUpdated: new Date(),
        startDate: new Date()
    }
    pluginSettings.campaign.list.push(campaign);
    await plugin.saveSettings(MASTER_PLUGIN);
}

async function deleteCampaign(
    plugin: RPGDungeonMasterPlugin,
    pluginSettings: PluginSettings,
    campaignIndex: number
) { 
    pluginSettings.campaign.list.splice(campaignIndex, 1)
    await plugin.saveSettings(MASTER_PLUGIN);
}

/**
 * Adds plugin submenu to Obsidian context menu. Provides ability to tag a folder
 * as a Campaign and to remove the tag if already present.
 * 
 * A tagged folder will show up as a Campaign in the plugin settings too.
 * @param plugin instance of DM plugin
 */
export async function configureTagMenu(plugin: RPGDungeonMasterPlugin) {

    plugin.registerEvent(
        plugin.app.workspace.on("file-menu", (menu, file) => {

            if (!(file instanceof TFolder)) return;

            const pluginSettings = plugin.getSettings(MASTER_PLUGIN); 
            const campaignsRoot = pluginSettings.campaign.rootFolder;
            if(!campaignsRoot) return;

            const canBeCampaign = file.path.startsWith(`${campaignsRoot}/`);

	        if (!canBeCampaign) return;

            menu
                .addSeparator()
                .addItem((item) => {
                    item.setTitle("RPG Master");
                    const options = item.setSubmenu();

                    const campaignIndex = pluginSettings.campaign.list.findIndex( c => c.vaultPath == file.path)

                    if(campaignIndex>=0) {
                        options.addItem(item => {
                            item
                                .setTitle("Remove Campaign (keeps folder)")
                                .onClick(async () => {
                                    await deleteCampaign(plugin, pluginSettings, campaignIndex);
                                    new Notice("Campaign removed")
                                })
                        })
                    }
                    else {
                        options.addItem(item => {
                            item
                                .setTitle("Set Folder As Campaign")
                                .onClick(async () => {
                                    await tagAsCampaign(plugin, pluginSettings, file.path, file.name)
                                    new Notice("Campaign Folder initialized")
                                })
                        })
                    }

                });

          



        })

    )
}