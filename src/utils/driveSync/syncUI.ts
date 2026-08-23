import { MarkdownView, Menu, Notice, setIcon, setTooltip, TFile } from "obsidian";
import RPGDungeonMasterPlugin from "../../rpgMasterPlugin";
import { unmount } from "svelte";
import { syncFile } from "./sync";
import { addPwdModal } from "../pwdModal";

export const RPG_SYNC_CLASS = 'rpg-master-sync'

export async function addTopViewIcon(view: MarkdownView, plugin: RPGDungeonMasterPlugin) {

    const file = view.file;
    if(!file) return;

    let sync = plugin.app.metadataCache.getFileCache(file)?.frontmatter?.rpg?.sync === true;

    // Reconcile changes made elsewhere: source mode, another plugin, etc.
    plugin.registerEvent(
        plugin.app.metadataCache.on("changed", (changedFile, _data, cache) => {
            if (changedFile.path !== file.path) return;

            sync = cache.frontmatter?.rpg?.sync === true;
        })
    );

    let pwModalOpen = {
        value: false
    };

    const action = addAction(
        view,
        () => {
            writeYamlConfig(file, plugin)
                // duplicates the callback registered above, but it's for added safety
                .then((v) => {
                    sync = v;
                    setIcon(action, sync ? "cloud-sync" : "cloud-off")
                    setTooltip(action, sync ? "Sync Enabled" : "Sync Disabled")
                }) 
        },
        () => {
            pwModalOpen.value = true
        },
        () => sync
    )

    const pwConfig = addPwdModal(
        view.containerEl,
        pwModalOpen,
        {
            onReturnPwd(v) {
                if(!file || ! v) return;
                syncFile(file, v, plugin)
                .then( r => {
                    if(r.success && r.status == 'synced'){
                        new Notice("Note uploaded")
                    }
                    if(!r.success){
                        new Notice(r.errorMessage)
                    }
                })
            },
        }
    )
    pwModalOpen = pwConfig.pwModalOpen;

    let cleanedUp = false;
    function cleanUp(){
        if(cleanedUp) return;
        cleanedUp = true;

        action.remove();
        unmount(pwConfig.pwdModal);
    }

    view.register(cleanUp);
    plugin.register(cleanUp);
}

function addAction(
    view: MarkdownView,
    onToggleSync: () => void,
    onSync: () => void,
    getSync: () => boolean
){
    const syncActive = getSync();

    const action = view.addAction(
        syncActive ? "cloud-check" : "cloud-off",
        syncActive ? "Sync Enabled" : "Sync Disabled",
        (ev) => {			
            const menu = new Menu();
            
            const syncActive = getSync();
            menu.addItem((item) => {
                item
                .onClick(onToggleSync)
                if(syncActive)
                    item .setTitle("Disable Drive Sync").setIcon('cloud-off')
                else 
                    item.setTitle("Enable Drive Sync").setIcon('cloud-check')
            })
            if(getSync()){
                menu.addItem((item) => {
                    item
                        .setTitle("Sync Now")
                        .setIcon('cloud-check')
                        .onClick(onSync)
                })
            }
            menu.showAtMouseEvent(ev)
        },
    );
    action.classList.add(RPG_SYNC_CLASS)

    return action;
}

async function writeYamlConfig(file: TFile, plugin: RPGDungeonMasterPlugin){

    let currSyncVal = false

    return plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {

        currSyncVal = frontmatter.rpg?.sync ?? currSyncVal;

        frontmatter.rpg ??= {};
        frontmatter.rpg.sync = !currSyncVal;
        frontmatter.rpg.docId ??= crypto.randomUUID();
    }).then( () => !currSyncVal)
}