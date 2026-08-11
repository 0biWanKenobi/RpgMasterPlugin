<script lang="ts">
	import { Button } from "rpg_shared/ui/base";

    interface Props {
      text: string
      canEdit: boolean
      canDelete: boolean
      onEditFolder?: () => void
      onDeleteFolder?: () => void
      onClick?: () => void
    }

    let {text, onClick, canEdit, canDelete, onEditFolder, onDeleteFolder}: Props = $props();

    const handleEdit = (event: MouseEvent) => {
        event.stopPropagation();
        onEditFolder?.();
    }

    const handleDelete = (event: MouseEvent) => {
      event.stopPropagation();
      onDeleteFolder?.();
    }

</script>


<Button size={14} class="folder-list-item nav-file-title" icon="folder" {onClick}>
    <span class="folder-list-name nav-dile-title-content">{text}</span>
    <span class="actions">
      {#if canEdit}
          <Button class="folder-button" tooltip="Rename" icon="pencil" onClick={handleEdit}/>
          {/if}
      {#if canDelete}
          <Button warning class="folder-button" tooltip="Delete" icon="folder-x" onClick={handleDelete}/>
      {/if}
    </span>
</Button>   


<style>

:global(.folder-list-item) {
    display: flex;
    align-items: center;
    gap: var(--size-4-2);
  
    width: 100%;
    min-height: 34px;
    padding: var(--size-4-2) var(--size-4-3);
  
    border: 1px solid transparent;
    border-radius: var(--radius-s);
  
    background: transparent;
    color: var(--text-normal);
  
    font: inherit;
    text-align: left;
    cursor: var(--cursor);
  
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease,
      transform 80ms ease;

    & .actions {
      margin-left: auto;
      display: flex;
      column-gap: 5px;
      opacity: 0;
      transition: opacity 150ms ease;
    }
    & .folder-button {
        --size: 22px;
        width: var(--size);
        height: var(--size);
        padding: 5px;
    }
    &:hover {
      background: var(--background-modifier-hover);
      color: var(--text-normal);
      & :global(.actions) {
          opacity: 1;
      }
    }

    &:focus-visible {
      outline: 2px solid var(--background-modifier-border-focus);
      outline-offset: 2px;
    }
    
    &:active {
      transform: translateY(1px);
      background: var(--background-modifier-active-hover);
    }
      
    &.is-selected {
      background: var(--background-modifier-active-hover);
      border-color: var(--background-modifier-border);
      color: var(--text-accent);
    }
}    






.folder-list-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: var(--font-ui-small);
  line-height: var(--line-height-tight);
}
</style>