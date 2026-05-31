import { ButtonComponent, Notice } from "obsidian";
import { listFoldersIn } from "../../googleDriveProtocol";
import { DriveFolder } from "rpg_shared/ui/driveFolder";
import { signal } from "@preact/signals";

import './folderSelector.css'

class FolderSelector {

    #container: HTMLElement;
    #root: HTMLElement;
    #actions: HTMLElement;

    #currentFolderId = signal('root');
    #parentFolderId = signal<string[]>([]);
    #showButtons = signal(false);
    #token!: string
    #onSelected: ((folderId: string) => void) | undefined = undefined;

    constructor(container: HTMLElement) {
        this.#container = container;
        this.#root = this.#container.createDiv('folder-selector');

        this.#actions = createDiv({
            cls: 'folder-actions'
        })

        this.#showButtons.subscribe((v) => {
            if(!v) this.#actions.addClass('hidden');
            else this.#actions.removeClass('hidden')
        })

        Object.seal(this);
    }


    async #listFolderContents(folderList: HTMLElement, folderId: string) {
        const folders = await listFoldersIn({
            accessToken: this.#token,
            rootFolderId: folderId
        })
        for (const folder of folders) {
            new DriveFolder(folderList)
                .setLabel(folder.name)
                .onClick(() => {
                    this.#parentFolderId.value = this.#parentFolderId.value.toSpliced(
                        this.#parentFolderId.value.length,
                        0,
                        folder.id
                    )
                    this.#currentFolderId.value = folder.id;
                    folderList.empty();
                    this.#listFolderContents(folderList, folder.id)
                })
        }
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
        const folderList = this.#root.createDiv({
            cls: "folder-list nav-files-container",
        })

        this.#root.appendChild(this.#actions);

        new ButtonComponent(this.#actions)
            .setButtonText('Cancel')
            .onClick(() => {
                folderList.empty();
                this.#showButtons.value = false;
                resolve(false)
            })

        let upButton: ButtonComponent | undefined = undefined;
        this.#parentFolderId.subscribe((v) => {
            if (!v.length) {
                upButton?.buttonEl.hide()
                return;
            }

            upButton ??= new ButtonComponent(this.#actions)
                .setButtonText('Up')
                .onClick(async () => {
                    folderList.empty();
                    const parentId = v.at(-1)!;
                    await this.#listFolderContents(folderList, parentId);
                    this.#currentFolderId.value = parentId;
                    this.#parentFolderId.value = this.#parentFolderId.value.toSpliced(
                        this.#parentFolderId.value.length - 1,
                        1
                    )
                })
            upButton.buttonEl.show()
        })

        new ButtonComponent(this.#actions)
            .setButtonText('Select Folder')
            .setCta()
            .onClick(() => {
                this.#onSelected?.call(this, this.#currentFolderId.value);
                this.#showButtons.value = false;
                resolve(true)
            })



        await this.#listFolderContents(folderList, 'root');

        return promise;
    }
}

Object.freeze(FolderSelector.prototype);

export { FolderSelector };