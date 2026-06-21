<script lang="ts">

import { type GoogleDriveFolderEntry } from "../../../googleDriveProtocol";

export type Folder = Omit<GoogleDriveFolderEntry, "mimeType">;
type Props = {
    path: Folder[],
}
let { path = $bindable() }: Props = $props()


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


</script>


<div class="path-indicator">
    <span class="scrolling-start">{pathStart()}</span>
    <span class="last-folder">{pathEnd()}</span>

</div>


<style>
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