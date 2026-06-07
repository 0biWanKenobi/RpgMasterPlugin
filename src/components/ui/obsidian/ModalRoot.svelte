<script lang="ts">
	import Icon from "../base/Icon.svelte";

	type Props = {
		title?: string;
		children?: any;
		onRequestClose?: () => void;
	};

	let {
		title = "",
		children,
		onRequestClose = () => {},
	}: Props = $props();
</script>

<div class="modal-container mod-dim">
	<div class="modal-bg" style="opacity: 0.85;"></div>
	<div class="modal">
		<div class="modal-close-button mod-raised clickable-icon">
			<span role="button" tabindex="0" onkeypress={null} onclick={onRequestClose} style="display: contents;">
				<Icon icon="x" />
			</span>
		</div>
		<div class="modal-header">
			<div class="modal-title">{title}</div>
		</div>
		<div class="modal-content">
			{@render children?.()}
		</div>
	</div>
</div>
