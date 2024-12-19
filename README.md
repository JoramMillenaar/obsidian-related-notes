# Related Notes

Find notes with similar meaning intelligently, helping you uncover hidden connections and insights within your Obsidian vault. Built with privacy in mind, this plugin operates entirely on your local device—your data stays private and secure.

![Screenshot](https://github.com/JoramMillenaar/obsidian-related-notes/raw/master/example.gif)


---
# 🚧 **Under Construction: Plugin in Development** 🚧
> ### ⚠️ **Notice: This Plugin is a Work in Progress!** ⚠️
>  
> **This README outlines the intended functionality for the Related Notes Finder plugin, but the plugin is not yet fully operational as described.**  
> 
> I'm actively working to bring these features to life. Contributions are encouraged and appreciated! Feel free to dive in, experiment, and help shape the final product.
---


## Features

- **Fully Local and Private**: Your notes and data are never sent outside your device. All processing is done locally to ensure complete privacy.


## Settings

Go to **Settings > Related Notes Finder** to customize the plugin’s behavior:
- **Number of Related Notes**: Set how many notes to display as related.
- **Plugin Server Port** (advanced): The plugin spins up a small local server for all the AI tricks. This determines which port to use for the local communication.


## Usage

1. When the plugin is initially enabled, it will automatically start forming the relations in the background. You can see the progress on the bottom right.
2. After that is finished, open a note and find a new tab in the leaf of your note with a telescope icon. Here you should see the top-related notes as represented by the percentage of overlap in meaning.
3. You can press on any of the notes in the list to navigate to.
4. If you created a new note or you edited your current note, be sure to press the refresh button to update the relations. This will also let the other notes relate to your new changes.

### Commands
- Use the command palette (press `Ctrl/Cmd + P`) and type "Refresh relations of all notes" to reset all the relations. This could be useful if the relations seemed to have been corrupted (the plugin is still in development!).

## Privacy and Security

One of Obsidian's greatest strengths is its commitment to data ownership and privacy. This plugin upholds that philosophy by making privacy its highest priority. All processing and note relations happen entirely on your device, ensuring your notes stay yours—always. 

**Related Notes Finder** is built with privacy at its core:  
- **Local Processing**: Every analysis and operation occurs directly on your device. Your notes never leave your vault.  
- **No Third-Party Dependencies**: Once installed, the plugin requires no internet access or external APIs, providing a fully private and secure experience.  

## Development

Want to contribute? Here's how to set up the development environment:

1. Clone the repository:
   ```bash
   git clone https://github.com/JoramMillenaar/related-notes.git
   ```
2. Navigate to the plugin directory and install dependencies:
   ```bash
   cd related-notes-finder
   npm install
   ```
3. Run the plugin in development mode:
   ```bash
   npm run dev
   ```

For more information on developing Obsidian plugins, check out the [Obsidian Plugin API documentation](https://github.com/obsidianmd/obsidian-api).

## Contributing

Contributions are very welcome! If you have ideas for improvements or new features, please open an issue or submit a pull request to start a discussion. I have plenty of ideas on powerful features to implement in the future, but I can use some help in getting the plugin to a stable point first.


### TODO  
Here are the current development goals for the plugin:  
- Pass the note's title to the embedder as well (maybe even make it weighty)
- Ensure the `onload` method is non-blocking by deferring data fetching to the `onLayoutReady` callback.  
- Add option to show notes to a similarity threshold, rather than a set amount of notes.
- Investigate using `this.app.metadataCache.getFileCache(file)` for file parsing instead of regex on raw content.  
- Find a more suitable template for extending the custom view.  
- Add a search option to search by semantic meaning
- Look into and fix odd resuls in similarity after updating note embeddings
- Test windows compatibility

### License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

#### External
The `src/vectra` folder contains code derived from vectra, licensed under the MIT License. See `src/vectra/LICENSE` for details.

---

With **Related Notes Finder**, explore your knowledge in a new way—intelligently, locally, and privately.
