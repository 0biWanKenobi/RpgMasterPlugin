import { ButtonComponent, Notice } from "obsidian";
import { GoogleDriveFolderEntry, listFoldersIn } from "../../googleDriveProtocol";
import { DriveFolder } from "rpg_shared/ui/driveFolder";
import { computed, Signal, signal } from "@preact/signals";

import './folderSelector.css'

type Pagination = {
    currentPageIdx: Signal<number>,
    nextPageToken: Signal<string | undefined>,
    pages: Page[]
}

type Page = {
    pageToken?: string,
    folders: GoogleDriveFolderEntry[]
}

type Folder = Omit<GoogleDriveFolderEntry, "mimeType">;

class FolderSelector {

    #container: HTMLElement;
    #root: HTMLElement;
    #actions: HTMLElement;

    #currentFolderId = signal('root');
    #parentFolderId = signal<string[]>([]);
    #showButtons = signal(false);
    #token!: string

    #pagination: Pagination = {
        currentPageIdx: signal(0),
        nextPageToken: signal(),
        pages: []
    }


    #path = signal<Folder[]>([{id: 'root', name: '/'}])

    /**
     * Current folder path up to parent folder
     */
    #pathStart = computed(
        () => {
            const maxIdx = this.#path.value.length - 1;
            return this.#path.value.reduce(
                (prev, curr, i) => {
                    if (i == maxIdx)
                        return prev;
                    prev = prev + curr.name + "/"
                    return prev.replace("//", "/");
                }
                , ""
            )
        }
    )

    /**
     * Last fragment of current folder path
     */
    #pathEnd = computed(() => {
        const maxIdx = this.#path.value.length - 1;
        return this.#path.value.at(maxIdx)?.name ?? ""
    })

    #onSelected: ((folderId: string) => void) | undefined = undefined;

    constructor(container: HTMLElement) {
        this.#container = container;
        this.#root = this.#container.createDiv('folder-selector');

        this.#actions = createDiv({
            cls: 'folder-actions'
        })

        this.#showButtons.subscribe((v) => {
            if (!v) this.#actions.addClass('hidden');
            else this.#actions.removeClass('hidden')
        })

        Object.seal(this);
    }


    async #listFolderContents(
        folderList: HTMLElement,
        folderId: string,
        targetPageToken?: string
    ) {
        const result = await listFoldersIn({
            accessToken: this.#token,
            rootFolderId: folderId,
            pageToken: targetPageToken
        })

        this.#renderFolderContents(result, folderList);

        return result
    }

    #renderFolderContents(fc: Page, folderList: HTMLElement) {
        for (const folder of fc.folders) {
            new DriveFolder(folderList)
                .setLabel(folder.name)
                .onClick(() => {
                    this.#parentFolderId.value = this.#parentFolderId.value.toSpliced(
                        this.#parentFolderId.value.length,
                        0,
                        this.#currentFolderId.value
                    )
                    this.#currentFolderId.value = folder.id;
                    this.#path.value = [...this.#path.peek(), {id: folder.id, name:folder.name}]
                    folderList.empty();
                    this.#listFolderContents(folderList, folder.id)
                })
        }
    }

    #updatePagination(lr: Page, index: number) {
        this.#pagination.nextPageToken.value = lr.pageToken;
        this.#pagination.currentPageIdx.value = index;
        this.#pagination.pages.push(lr);
    }

    #resetPagination(lr: Page) {
        this.#pagination.pages = [];
        this.#updatePagination(lr, 0);
    }

    onSelected(callback: (folderId: string) => void) {
        this.#onSelected = callback;
        return this;
    }


    async display(getAccessToken: () => Promise<string | undefined>) {
        const { promise, resolve } = Promise.withResolvers<boolean>();
        this.#showButtons.value = true;

        const accessToken = await getAccessToken();

        if (!accessToken) {
            new Notice("Login error")
            resolve(false);
            return;
        }
        this.#token = accessToken;
        this.#root.empty();

        const pathIndicator = this.#root.createDiv({cls: 'path-indicator'})
        const pathStart = pathIndicator.createSpan({cls: "scrolling-start" })
        this.#pathStart.subscribe( p => {
            pathStart.setText(p)
        })

        const pathEnd = pathIndicator.createSpan({cls: "last-folder"})
        this.#pathEnd.subscribe( p => {
            pathEnd.setText(p)
        })

        const folderScroller = this.#root.createDiv({
            cls: "scrollable-folders"
        })

        const folderList = folderScroller.createDiv({
            cls: "folder-list nav-files-container",
        })

        const scrollButtons = folderScroller.createDiv({
            cls: "scroll-buttons"
        })

        const prevPageBtn = new ButtonComponent(scrollButtons)
            .setIcon('arrow-up')
            .onClick(async () => {
                const pgn = this.#pagination;
                const targetPageNr = pgn.currentPageIdx.value - 1;
                const page = pgn.pages.at(targetPageNr);
                if (!page) {
                    new Notice("Error loading folders")
                    return;
                }
                folderList.empty();
                this.#renderFolderContents(page, folderList);
                this.#updatePagination(page, targetPageNr);
            })
        this.#pagination.currentPageIdx.subscribe(v => {
            prevPageBtn.setDisabled(v == 0)
        })

        const nextPageBtn = new ButtonComponent(scrollButtons)
            .setIcon('arrow-down')
            .onClick(async () => {
                const pgn = this.#pagination;
                const targetPageNr = pgn.currentPageIdx.value + 1;
                const page = pgn.pages.at(targetPageNr);
                folderList.empty();

                if (page) {
                    this.#renderFolderContents(page, folderList);
                    this.#updatePagination(page, targetPageNr)
                    return;
                }

                const res = await this.#listFolderContents(
                    folderList,
                    this.#currentFolderId.value,
                    pgn.nextPageToken.value
                )
                this.#updatePagination(res, targetPageNr)
            })

        this.#pagination.nextPageToken.subscribe(v => {
            nextPageBtn.setDisabled(!v)
        })

        this.#root.appendChild(this.#actions);

        new ButtonComponent(this.#actions)
            .setButtonText('Cancel')
            .onClick(() => {
                folderScroller.empty();
                this.#showButtons.value = false;
                resolve(false)
            })

        let parentFolderButton: ButtonComponent | undefined = undefined;
        this.#parentFolderId.subscribe((v) => {
            if (!v.length) {
                parentFolderButton?.buttonEl.hide()
                return;
            }

            parentFolderButton ??= new ButtonComponent(this.#actions)
                .setButtonText('Up')
                .onClick(async () => {
                    folderList.empty();
                    const parentId = this.#parentFolderId.value.at(-1)!;
                    const result = await this.#listFolderContents(folderList, parentId);
                    this.#resetPagination(result);

                    this.#currentFolderId.value = parentId;
                    this.#parentFolderId.value = this.#parentFolderId.value.toSpliced(
                        this.#parentFolderId.value.length - 1,
                        1
                    )
                    this.#path.value = this.#path.value.toSpliced(
                        this.#path.value.length -1, 
                        1
                    )
                })
            parentFolderButton.buttonEl.show()
        })

        new ButtonComponent(this.#actions)
            .setButtonText('Select Folder')
            .setCta()
            .onClick(() => {
                this.#onSelected?.call(this, this.#currentFolderId.value);
                this.#showButtons.value = false;
                resolve(true)
            })



        const result = await this.#listFolderContents(folderList, 'root');
        this.#resetPagination(result);

        return promise;
    }
}

Object.freeze(FolderSelector.prototype);

export { FolderSelector };