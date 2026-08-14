import { MarkdownView, Menu, Notice, TFile } from "obsidian";
import RPGDungeonMasterPlugin from "../../rpgMasterPlugin";
import { Component, ComponentProps, mount, unmount } from "svelte";
import { syncFile } from "./sync";
import { UserPasswordModal } from "rpg_shared/ui/custom";
import { createState } from "../../helpers.svelte";

export const RPG_SYNC_CLASS = 'rpg-master-sync'

type PwdModalState = {value: boolean}

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
                .then((v) => sync = v) 
        },
        () => {
            pwModalOpen.value = true
        },
        () => sync
    )

    const pwConfig = addPwdModal(
        view,
        file,
        plugin,
        pwModalOpen
    )
    pwModalOpen = pwConfig.pwModalOpen

    plugin.register(() => {
        action.remove();
        unmount(pwConfig.pwdModal);
    });
}

function addAction(
    view: MarkdownView,
    onToggleSync: () => void,
    onSync: () => void,
    getSync: () => boolean
){
    const action = view.addAction(
        "cloud-sync",
        "RPG Sync",
        (ev) => {			
            const menu = new Menu();
            
            menu.addItem((item) => {
                item
                    .setTitle("Toggle Drive Sync")
                    .setIcon('cloud-sync')
                    .onClick(onToggleSync)
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

function addPwdModal(
    view: MarkdownView,
    file: TFile,
    plugin: RPGDungeonMasterPlugin,
    pwModalOpen: PwdModalState
) {
    const modalWrapper: Component<ComponentProps<typeof UserPasswordModal>> = (internals, props) => {
        pwModalOpen = createState(false);
        return UserPasswordModal(internals, props)
    }

    const pwdModal = mount(
        modalWrapper,
        {
            target: view.containerEl,
            props: {
                get open(){ return pwModalOpen.value},
                set open(v) { pwModalOpen.value = v},
                title: "Provide password",
                onReturn(v) {
                    pwModalOpen.value = false;
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
                onCancel() {
                    pwModalOpen.value = false
                }
            }
        }
    )

    return {
        pwdModal,
        pwModalOpen
    }
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