import { computed, signal } from "@preact/signals";
import "./index.css"
import { GoogleDriveFolderEntry } from "../../../googleDriveProtocol";

type Folder = Omit<GoogleDriveFolderEntry, "mimeType">;

class FolderPathIndicator {

    #container: HTMLElement;
    #contentRoot: HTMLElement;
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

    constructor(container: HTMLElement) {
        this.#container = container;

        this.#contentRoot = this.#container.createDiv({ cls: 'path-indicator' })
        const pathStart = this.#contentRoot.createSpan({ cls: "scrolling-start" })
        const pathEnd = this.#contentRoot.createSpan({ cls: "last-folder" })

        this.#pathStart.subscribe(p => {
            pathStart.setText(p)
        })

        this.#pathEnd.subscribe(p => {
            pathEnd.setText(p)
        })

        Object.seal(this);
    }

    push(fragment: Folder) {
        this.#path.value = [...this.#path.peek(), fragment]
    }

    pop() {
        this.#path.value = this.#path.value.toSpliced(
            this.#path.value.length -1, 
            1
        )
    }

    get(){
        return this.#pathStart.value + this.#pathEnd.value;
    }

    remove(){
        this.#contentRoot.remove();
    }
}

Object.freeze(FolderPathIndicator.prototype);

export { FolderPathIndicator }