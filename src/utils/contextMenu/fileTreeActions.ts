import { Notice, TFolder } from "obsidian";
import RPGDungeonMasterPlugin from "../../rpgMasterPlugin";
import { MASTER_PLUGIN } from "../capability";
import { CampaignConfig, PluginSettings } from "../interfaces";
import { createFolder } from "rpg_shared/sync/googleDriveOperations";
import { addPwdModal } from "../pwdModal";
import { getGoogleAccessToken, isGoogleAccessTokenExpired } from "../driveSync/driveSession";
import { unmount } from "svelte";

async function tagAsCampaign(
    plugin: RPGDungeonMasterPlugin,
    pluginSettings: PluginSettings,
    folderPath: string,
    folderName: string
) {
    
    const campaign: CampaignConfig = {
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
 * Adds plugin submenu to Obsidian context menu. Provides ability to
 * - tag a folder as a Campaign
 * - remove the tag if already present.
 * - sync a Campaign folder to Drive (creates only the folder itself)
 * 
 * A tagged folder will show up as a Campaign in the plugin settings too.
 * @param plugin instance of DM plugin
 */
export async function configureContextMenu(plugin: RPGDungeonMasterPlugin) {

    async function createCampaignFolder(pluginSettings: PluginSettings, campaignIndex: number, pwd: string){
        const tk = await getGoogleAccessToken(
            pwd,
            isGoogleAccessTokenExpired(pluginSettings.gdriveSettings.expiresAt),
            plugin
        )
        if(!tk.success){
            new Notice("Authentication failed") 
            return;
        }

        const rootFolder = pluginSettings.gdriveSettings.folderId
        if(!rootFolder) {
            new Notice("Configure Drive folder in Settings!")
            return;
        }
        const campaign = pluginSettings.campaign.list[campaignIndex];
        if(!campaign) return;
        const response = await createFolder(
            tk.accessToken,
            campaign.name,
            { parentFolderId: rootFolder, properties: {cmp_id: campaign.id}}
        )
        if(response.success) {
            new Notice("Folder synchronized");
            campaign.syncId = response.folder.id;
            await plugin.saveSettings(MASTER_PLUGIN);
        }

    }

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
                        options
                            .addItem(item => {
                                item.setTitle("Remove Campaign (keeps folder)")
                                    .onClick(async () => {
                                        await deleteCampaign(plugin, pluginSettings, campaignIndex);
                                        new Notice("Campaign removed")
                                    })
                            })

                        const campaign = pluginSettings.campaign.list.at(campaignIndex)!;
                        if(campaign.syncId) return;
                        options
                            .addItem(item => {
                                item.setTitle("Sync with Drive")
                                    .onClick(async () => {
                                        let modalOpen = { value: false }

                                        const modalData = addPwdModal(
                                            activeDocument.body,
                                            modalOpen,
                                            {
                                                async onReturnPwd(v) {
                                                    unmount(modalData.pwdModal)
                                                    if(!v) return;
                                                    await createCampaignFolder(pluginSettings, campaignIndex, v);
                                                },
                                                onCancel() {
                                                    unmount(modalData.pwdModal)
                                                },
                                            }
                                        )
                                        modalData.pwModalOpen.value = true;
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