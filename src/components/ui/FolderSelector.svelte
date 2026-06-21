<script lang="ts">
	import { Notice } from "obsidian";
	import { type GoogleDriveFolderEntry, listFoldersIn } from "../../googleDriveProtocol";
	import FolderPathIndicator, { type Folder } from "../../settings/driveSync/folderPathIndicator/index.svelte";
	import { Button } from "rpg_shared/ui/base";
	import DriveFolder from "./DriveFolder.svelte";
	import { onMount } from "svelte";

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

    let {getAccessToken, onSelected, onCancel}: Props = $props();

    let load = $state<"inprogress"|"success"|"error">("inprogress")
    let token: string = '';

   

    onMount(async () => {
        const res = await getAccessToken();
        loadRootFolder(res);
    })

    async function loadRootFolder(currentToken: string | undefined){
        if(!currentToken) {
            new Notice("Login error");
            load = "error";
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

    function resetPagination(lr: Page) {
        pagination.pages = [];
        updatePagination(lr, 0);
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
        listFolderContents(folder.id)
    }

</script>

{#if load == "inprogress"}
    <div>Loading..</div>
{:else if load == "error" }
    <div>Cannot load folders</div>
    <Button icon="refresh-ccw" text="Retry" onClick={() => loadRootFolder(token)}/>
{:else}


    <div class="folder-selector">
        <FolderPathIndicator bind:this={pathIndicatorRef} path={folderIndicatorState.path}/>

        <div class="scrollable-folders">
            <div class="folder-list nav-files-container">
                {#if pagination.page}
                    {#each pagination.page.folders as folder}
                        <DriveFolder text={folder.name} onClick={() => onFolderSelected(folder)}/>
                    {/each}
                {/if}

            </div>
            <div class="scroll-buttons">
                <Button icon="arrow-up" disabled={prevPageDisabled} onClick={onScrollUp}></Button>
                <Button icon="arrow-down" disabled={nextPageDisabled} onClick={onScrollDown}></Button>
            </div>
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
                        selectedPath
                    )
                }}
            />
        </div>
   

    </div>

{/if}

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