<script lang="ts">
	import { Button } from "rpg_shared/ui/base";


import { type GoogleDriveFolderEntry } from "../../utils/googleDriveProtocol";

export type Folder = Omit<GoogleDriveFolderEntry, "mimeType">;
type Props = {
    onNavigate: (folderId: string, folderPath: string) => void,
    path: Folder[],
}
let { path = $bindable(), onNavigate }: Props = $props()


const pathStart = $derived(() => {
    const maxIdx = path.length - 1;
    return path.reduce(
        (prev, curr, i) => {
            if (i == maxIdx)
                return prev;
            prev = prev + curr.name + "/"
            return prev.replace("//", "/");
        }
        , ""
    )
})

const pathEnd = $derived(() => {
    const maxIdx = path.length - 1;
        return path.at(maxIdx)?.name ?? ""
})

export function push(fragment: Folder) {
        path = [...path, fragment]
    }

export function pop() {
    path = path.toSpliced(
        path.length -1, 
        1
    )
}

export function get(){
    return pathStart() + pathEnd();
}


function navigateToFolder(folderId: string, folderPath: string) {    
    for (let i = path.length - 1; i >= 0; i--) {
        if (path[i]?.id != folderId) {
            path.pop();
        } else {
            break;
        }
    }

    onNavigate(folderId, folderPath);
}

</script>


<div class="path-indicator">
    <Button size={14} class="home-button" icon="home" onClick={() => {
        navigateToFolder('root', '/');
    }} />
    <span class="scrolling-start">{pathStart()}</span>
    <span class="last-folder">{pathEnd()}</span>
</div>


<style>

:global(.home-button) {
    margin-right: var(--size-4-1);
    --size: 22px;
    width: var(--size);
    height: var(--size);
    padding: 5px;
    flex-shrink: 0;
}
.path-indicator {
    padding: var(--size-4-2);
    border: 1px solid var(--color-base-40);
    border-radius: 4px;
    display: flex;
    max-width: 100%; /* Or your constrained width */
    white-space: nowrap;
}

.scrolling-start {
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl; /* Forces truncation to happen at the "start" of this segment */
  text-align: left;
}
.last-folder {
  flex-shrink: 0; /* Ensures the filename is NEVER cut off */
}
</style>