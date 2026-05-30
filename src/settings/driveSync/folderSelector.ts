import { ButtonComponent, Notice } from "obsidian";
import { listFoldersIn } from "../../googleDriveProtocol";
import { DriveFolder } from "rpg_shared/ui/driveFolder";
import { signal } from "@preact/signals";

class FolderSelector {

    #container: HTMLElement;
    #root: HTMLElement;
    #currentFolderId = signal('root');
    #parentFolderId = signal<string[]>([]);
    #token!: string
    #onSelected: ((folderId: string) => void) | undefined = undefined;

    constructor(container: HTMLElement) {
        this.#container = container;
        this.#root = this.#container.createDiv('folder-selector');
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

    async onSelected(callback: (folderId: string) => void) {
        this.#onSelected = callback;
    }


    async display(getAccessToken: () => Promise<string | undefined>) {
        const { promise, resolve } = Promise.withResolvers<boolean>();

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

        const actions = this.#root.createDiv({
            cls: 'folder-actions'
        })

        new ButtonComponent(actions)
            .setButtonText('Cancel')
            .onClick(() => {
                folderList.empty();
            })

        let upButton: ButtonComponent | undefined = undefined;
        this.#parentFolderId.subscribe((v) => {
            if (!v.length) {
                upButton?.buttonEl.hide()
                return;
            }

            upButton ??= new ButtonComponent(actions)
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

        new ButtonComponent(actions)
            .setButtonText('Select Folder')
            .setCta()
            .onClick(() => {
                this.#onSelected?.call(this, this.#currentFolderId.value)
            })



        await this.#listFolderContents(folderList, 'root');

        return promise;
    }
}

Object.freeze(FolderSelector.prototype);

export { FolderSelector };