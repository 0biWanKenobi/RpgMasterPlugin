<script lang="ts">
	import { Notice } from "obsidian";
	import { type GoogleDriveFolderEntry, listFoldersIn } from "../../utils/googleDriveProtocol";
	import FolderPathIndicator, { type Folder } from "./FolderPathIndicator.svelte";
	import { Button } from "rpg_shared/ui/base";
	import DriveFolder from "./DriveFolder.svelte";
	import { onMount } from "svelte";
	import { SettingItemGroup, SettingItem, Modal } from "rpg_shared/ui/obsidian";
	import { createFolder, deleteFolder, renameFolder } from "rpg_shared/sync/googleDriveOperations";
	import { ConfirmModal } from "rpg_shared/ui/custom";

    type Pagination = {
        currentPageIdx: number,
        nextPageToken: string | undefined,
        pages: Page[],
        page: Page | undefined
    }

    type Page = {
        pageToken?: string,
        folders: GoogleDriveFolderEntry[]
    }

    interface Props {
        getAccessToken: () => Promise<string|undefined>
        onSelected: (folderId: string, folderPath: string) => void
        onCancel: () => void
    }

    let {
        getAccessToken, onSelected, onCancel
    }: Props = $props();

    let load = $state<"inprogress"|"success"|"error">("inprogress")
    let token: string = '';

    let newFolderModalOpen = $state(false);
    const renameFolderState = $state({
        open: false,
        id: ''
    });

    const deleteFolderState = $state({
        open: false,
        id: '',
        name: '',
        action: async () => {
            const token = await getAccessToken();
            if(!token) return;
            const response = await deleteFolder(token, deleteFolderState.id);
            if(!response.success) {
                console.error(response.error);
                new Notice(response.errorMessage)
            }
            else{
                new Notice(`Folder ${deleteFolderState.name} deleted successfully`)
                reloadContents()
            }
            deleteFolderState.open = false;
        }
    })


    let modalOpen = $state({
        get value() { return newFolderModalOpen || renameFolderState.open },
        set value(v) { newFolderModalOpen = renameFolderState.open = v }
    })

    const modalState = $derived(
        newFolderModalOpen 
            ? {
                title: "Create Folder",
                inputName: "Folder Name",
                inputDescription: "Name of the new folder",
                buttonText: "Create",
                buttonAction: async () => {
                    const token = await getAccessToken();
                    if(!token) return;
                    const response = await createFolder(token, folderName, {parentFolderId: folderNavigation.currentFolderId});
                    if(!response.success) {
                        console.error(response.error);
                        new Notice(response.errorMessage)
                    }
                    else{
                        new Notice(`Folder ${folderName} created successfully`)
                        reloadContents()
                    }
                    modalOpen.value = false;
                }
            }
            : {
                title: "Rename to",
                inputName: "New Name",
                inputDescription: "New Name for the folder",
                buttonText: "Save",
                buttonAction: async () => {
                    const token = await getAccessToken();
                    if(!token) return;
                    const response = await renameFolder(token, renameFolderState.id, folderName);
                    if(!response.success) {
                        console.error(response.error);
                        new Notice(response.errorMessage)
                    }
                    else{
                        new Notice('Folder renamed successfully')
                        reloadContents();
                    }
                    modalOpen.value = false;
                }
            }
    )

    let folderName = $state<string>("");

    onMount(async () => {
        const res = await getAccessToken();
        if(!res) {
            console.warn("Cannot get access token");
            load = "inprogress";
            onCancel();
            return;
        }
        loadRootFolder(res);
    })

    async function loadRootFolder(currentToken: string | undefined){
        if(!currentToken) {
            new Notice("Login error");
            load = "error";
            onCancel();
            return;
        }
        token = currentToken;
        load = "success";

        const page = await listFolderContents('root');
        resetPagination(page);
    }

    let pathIndicatorRef = $state<FolderPathIndicator>()

    const folderIndicatorState = $state({
        path: [{id: 'root', name: '/'}] as Folder[]
    })


    const folderNavigation = $state({
        parentFolderId: [] as string [],
        currentFolderId: 'root',
    })

    const pagination = $state<Pagination>({
        currentPageIdx: 0,
        nextPageToken: undefined,
        pages: [],
        page: undefined
    })

    const prevPageDisabled = $derived(pagination.currentPageIdx == 0)
    const nextPageDisabled = $derived(!pagination.nextPageToken)

    async function listFolderContents(
        folderId: string,
        targetPageToken?: string
    ) {
        pagination.page = await listFoldersIn({
            accessToken: token,
            rootFolderId: folderId,
            pageToken: targetPageToken
        })

        return pagination.page;
    }

    function updatePagination(lr: Page, index: number) {
        pagination.nextPageToken = lr.pageToken;
        pagination.currentPageIdx = index;
        pagination.pages.push(lr);
    }

    function resetPagination(lr: Page, index = 0) {
        pagination.pages = [];
        updatePagination(lr, index);
    }

    async function reloadContents({
        folderId = folderNavigation.currentFolderId,
        pageToken = undefined as string | undefined,
        index = 0
    } = {}) {
        const result = await listFolderContents(folderId, pageToken);
        resetPagination(result, index);
    }

    const onScrollUp = () => {
        const targetPageNr = pagination.currentPageIdx - 1;
        const page = pagination.pages.at(targetPageNr);
        if(!page) {
            new Notice("Error loading folders")
            return;
        }

       pagination.page = page;
       pagination.nextPageToken = page.pageToken
       pagination.currentPageIdx = targetPageNr

    }
    
    const onScrollDown = async () => {
        const targetPageNr = pagination.currentPageIdx + 1;
        const page = pagination.pages.at(targetPageNr);
        
        if(page) {
            pagination.page = page;
            updatePagination(page, targetPageNr);
            return;
        }
        
        const res = await listFolderContents(folderNavigation.currentFolderId, pagination.nextPageToken);
        updatePagination(res, targetPageNr)
    }

    const onFolderSelected = async (folder: Folder) => {
        folderNavigation.parentFolderId.push(folderNavigation.currentFolderId);
        folderNavigation.currentFolderId = folder.id;

        pathIndicatorRef?.push(folder)
        var page = await listFolderContents(folder.id)
        resetPagination(page);;
    }

    const onFolderNavigate = async (folderId: string, folderPath: string) => {
        if(folderId == folderNavigation.currentFolderId) return;

        await reloadContents({folderId});

        folderNavigation.currentFolderId = folderId;
        folderNavigation.parentFolderId = folderPath.split("/").filter(p => p != "");
    }

</script>

{#if load == "inprogress"}
    <div>Loading..</div>
{:else if load == "error" }
    <div>Cannot load folders</div>
    <Button icon="refresh-ccw" text="Retry" onClick={() => loadRootFolder(token)}/>
{:else}


    <div class="folder-selector">
        <FolderPathIndicator bind:this={pathIndicatorRef} path={folderIndicatorState.path} onNavigate={onFolderNavigate}/>

        <div class="scrollable-folders">
            <div class="folder-list nav-files-container">
                {#if pagination.page}
                    {#each pagination.page.folders as folder}
                        <DriveFolder
                            text={folder.name}
                            onClick={() => onFolderSelected(folder)}
                            canEdit={folder.capabilities.canEdit}
                            onEditFolder={() => {
                                renameFolderState.id = folder.id
                                renameFolderState.open = true
                            }}
                            canDelete={folder.capabilities.canTrash}
                            onDeleteFolder={() => {
                                deleteFolderState.id = folder.id;
                                deleteFolderState.name = folder.name;
                                deleteFolderState.open = true;
                            }}
                        />
                    {/each}
                {/if}

            </div>
            {#if !prevPageDisabled || !nextPageDisabled}
            <div class="scroll-buttons">
                <Button icon="arrow-up" disabled={prevPageDisabled} onClick={onScrollUp}></Button>
                <Button icon="arrow-down" disabled={nextPageDisabled} onClick={onScrollDown}></Button>
            </div>
            {/if}
        </div>

        <div class="folder-actions">
            <Button text="Cancel" onClick={() => {
                onCancel();
            }}/>
            <Button
                text="Up"
                disabled={folderNavigation.currentFolderId == 'root'}
                onClick={async () => {
                    const parentId = folderNavigation.parentFolderId.at(-1)!;
                    const result = await listFolderContents(parentId);
                    resetPagination(result);

                    folderNavigation.currentFolderId = parentId;
                    folderNavigation.parentFolderId.pop();
                    pathIndicatorRef?.pop();                    
                }}
            />
            <Button
                text="Select Folder"
                cta
                onClick={() => {
                    const selectedPath = pathIndicatorRef?.get();
                    if(!selectedPath) return;
                    onSelected(
                        folderNavigation.currentFolderId,
                        selectedPath,
                    )
                }}
            /><Button
                text="Create Folder"
                cta
                onClick={() => {
                    if(!pathIndicatorRef?.get()) return; // current path must be defined
                    newFolderModalOpen = true;
                }}
            />
        </div>
   

    </div>

{/if}

<Modal
    bind:open={modalOpen.value}
    title={modalState.title}

>
    <SettingItemGroup>
        <SettingItem name={modalState.inputName} description={modalState.inputDescription}>
            <input id="folder_name" type="text" oninput={(v) => folderName = v.currentTarget.value} />
        </SettingItem>
        <SettingItem name="">
            <Button text={modalState.buttonText} onClick={modalState.buttonAction} />
        </SettingItem>
    </SettingItemGroup>
</Modal>

<ConfirmModal
    bind:open={deleteFolderState.open}
    title="Confirm Deletion?"
    onClose={(confirm) => {
        if(!confirm) return;
        deleteFolderState.action()
    }}
/>

<style>

    .folder-list {
        display: flex;
        flex-direction: column;
        gap: var(--size-2-1);
        padding: var(--size-4-2);
    }

    .scrollable-folders {
        display: flex;  
    }

    .scroll-buttons {
        padding: var(--size-4-2);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .folder-actions {
        display: flex;
        justify-content: start;
        column-gap: 10px;
    }

</style>