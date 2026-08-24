import { Menu, type MenuItem, Notice, TFolder } from "obsidian";
import type RPGDungeonMasterPlugin from "../../rpgMasterPlugin";
import { MASTER_PLUGIN } from "../capability";
import type { CampaignConfig, PluginSettings } from "../interfaces";
import { createFolder } from "rpg_shared/sync/googleDriveOperations";
import { addPwdModal } from "../pwdModal";
import { getGoogleAccessToken, isGoogleAccessTokenExpired } from "../driveSync/driveSession";
import { mount, unmount } from "svelte";
import OutsideVaultInfo from "./outsideVaultInfo.svelte";
import { Toggle } from "rpg_shared/ui/base";
import { hasParentCampaign } from "./utils";

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

    let pluginSettings: PluginSettings = undefined as unknown as PluginSettings;
    let campaignIndex = -1;
    let rootMenu: Menu = undefined as unknown as Menu;

    async function createCampaignFolder(pwd: string){
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


    /**
     * Asks user for password, then tries to create folder on Drive
     */
    async function handleDriveSyncSelected() {
        rootMenu.close();
        let modalOpen = { value: false }

        const modalData = addPwdModal(
            activeDocument.body,
            modalOpen,
            {
                async onReturnPwd(v) {
                    unmount(modalData.pwdModal)
                    if(!v) return;
                    await createCampaignFolder(v);
                },
                onCancel() {
                    unmount(modalData.pwdModal)
                },
            }
        )
        modalData.pwModalOpen.value = true;
    }

    /**
     * Add options for a folder already marked as campaign.
     * @param subMenu 2nd level context menu
     * @returns `void`
     */
    function addOptionsForCampaign(subMenu: Menu){
        subMenu
            .addItem(item => {
                item.setTitle("Remove Campaign (keeps folder)")
                    .onClick(async () => {
                        await deleteCampaign(plugin, pluginSettings, campaignIndex);
                        new Notice("Campaign removed")
                    })
            })

        const campaign = campaignIndex >= 0 ? pluginSettings.campaign.list.at(campaignIndex)! : undefined;
        if(campaign?.syncId) return;
        subMenu
            .addItem(item => {
                item.setTitle("Sync with Drive")
                    .onClick(handleDriveSyncSelected)

            })
    }

    /**
     * Add options for a folder that is not marked as campaign.
     * @param subMenu 2nd level context menu
     */
    function addOptionsForFolder(subMenu: Menu, file: TFolder) {

        if(hasParentCampaign(pluginSettings.campaign, file)) {
            subMenu
            .addItem( it => it
                .setTitle("Cannot create nested Campaigns")
                .setIcon("info")
                .setIsLabel(true)
            )
            return;
        }


        const syncOption = createFragment();
        let target: HTMLDivElement | undefined;
        syncOption.createDiv(undefined, el => {
            el.setCssStyles({
                display: "flex",
                columnGap: "2px",
                alignContent: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                color: "var(--text-normal)"
            })
            el.createDiv(undefined,  sp => sp.setText("Sync Now?"))
            target = el.createDiv()
        })

        let syncNow = false;
        mount(Toggle, {
            props: {
                value: false,
                onChange(v) { syncNow = v },
            },
            target: target!
        })

        subMenu.addItem(item => {
            item
                .setTitle("Set Folder As Campaign")
                .setIsLabel(true)
                .onClick(async () => {
                    await tagAsCampaign(plugin, pluginSettings, file.path, file.name)
                    new Notice("Campaign Folder initialized")
                    if(syncNow) {
                        campaignIndex = pluginSettings.campaign.list.findIndex( c => c.vaultPath == file.path)
                        await handleDriveSyncSelected()
                    }
                })
        }).addItem(item => {
            item.setTitle(syncOption).setDisabled(true)
        })
    }

    /**
     * Adds an option to configure the Vault Location, warning the user that it is
     * currently missing.
     * @param subMenu 2nd level context menu
     */
    function addNoVaultLocation(subMenu: Menu){
        subMenu
         .addItem( it => it
            .setTitle("Missing Vault Location")
            .setIcon("info")
            .setIsLabel(true)
        )
        .addSeparator()
        .addItem( it => it
            .setTitle("Select a Vault Location for your campaigns")
            .setIcon("folder-cog")
            .onClick(async () => {
                const setting = (plugin.app as any).setting;
                await setting.open()
                setting.openTabById(plugin.manifest.id);
            })
        );
    }

    /**
     * Adds a warning subMenu for when user tries to configure a folder as Campaign
     * and the folder is outside the campaigns root
     * @param subMenu 2nd level context menu
     * @param campaignsFolder path of campaigns root folder
     * @returns `void`
     */
    function addOutsideOfRootWarning(subMenu: Menu, campaignsFolder: string){
        const detailFrg = createFragment();

        const component = mount(
            OutsideVaultInfo,
            {
                props: { campaignsFolder },
                target: detailFrg.createDiv("info", el => {
                    el.setCssStyles({
                        whiteSpace: "normal",
                    })
                })
            }
        )

        subMenu
         .addItem( it => it
            .setTitle(detailFrg)
            .setIcon("info")
            .setIsLabel(true)
        )

        return component;
    }

    /**
     * Utility function that creates the root menu "RPG Master" option
     * @param configure menu configuration callback, as root menu and 2level menu as params
     */
    function bootstrapMenu(configure: (item: MenuItem, subMenu: Menu) => void){        
        rootMenu
            .addSeparator()
            .addItem((item) => {
                item.setTitle("RPG Master");
                configure(item, item.setSubmenu())
            })
    }

    plugin.registerEvent(
        plugin.app.workspace.on("file-menu", (menu, file) => {

            if (!(file instanceof TFolder)) return;

            rootMenu = menu;

            pluginSettings = plugin.getSettings(MASTER_PLUGIN); 
            const campaignsRoot = pluginSettings.campaign.rootFolder;
            if(!campaignsRoot){
                bootstrapMenu((_, subMenu) => {
                    addNoVaultLocation(subMenu);
                })
                return;
            }

            const canBeCampaign = file.path.startsWith(`${campaignsRoot}/`);

	        if (!canBeCampaign) {
                bootstrapMenu((_, subMenu) => {
                    const component = addOutsideOfRootWarning(subMenu, campaignsRoot)
                    rootMenu.register(() => unmount(component))
                })
                return;
            }

            bootstrapMenu((_, subMenu) => {
                campaignIndex = pluginSettings.campaign.list.findIndex( c => c.vaultPath == file.path)

                    if(campaignIndex>=0) {
                        addOptionsForCampaign(subMenu)
                    }
                    else {
                        addOptionsForFolder(subMenu, file)
                    }
            })
        })
    )
}