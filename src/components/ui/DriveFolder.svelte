<script lang="ts">
	import { Button } from "rpg_shared/ui/base";

    interface Props {
      text: string
      onClick?: () => void
    }

    let {text, onClick}: Props = $props();

</script>


<Button class="folder-list-item nav-file-title" icon="folder" {onClick}>
    <span class="folder-list-name nav-dile-title-content">{text}</span>
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

  &:hover {
    background: var(--background-modifier-hover);
    color: var(--text-normal);
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