import {
  AbstractInputSuggest,
  App,
  TFolder,
} from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  constructor(
    app: App,
    inputEl: HTMLInputElement,
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): TFolder[] {
    const q = query.toLowerCase();

    return this.app.vault
      .getAllFolders()
      .filter(folder =>
        folder.path.toLowerCase().includes(q)
      );
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path);
  }
}