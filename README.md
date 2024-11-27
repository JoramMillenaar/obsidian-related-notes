# Related Notes

**Related Notes Finder** is an Obsidian plugin that intelligently suggests related notes by their meaning, helping you uncover hidden connections and insights within your knowledge vault. Built with privacy in mind, this plugin operates entirely on your local device—your data stays private and secure.

<details>
<summary>Note From the Creator</summary>
This plugin excites me. For me, Obsidian’s greatest value lies in reducing the strain of writing. The whole Zettelkasten approach—don’t worry about structure, just focus on relationships—is an amazing method to capture thoughts and build a personal knowledge base. However, there’s still one significant pain point in my writing routine: relating notes. It’s challenging to remember existing notes (especially when you have over a thousand) and decide how to connect them. This plugin aims to ease that burden by presenting an overview of the most closely related notes in meaning—all while staying local and on-device, a core Obsidian principle that I deeply value.
</details>


<details>
<summary>The Technology Behind Driving It</summary>
I won’t delve into too much detail or documentation here, but I can’t help but rave about the incredible technology that powers this plugin. At its core is an AI that transforms sentences and paragraphs into representations that encapsulate not just the words but the meaning. These “meaning” representations are stored and used to calculate the closest neighbors in a multidimensional “meaning space.” This space is high-dimensional, enabling it to capture the many nuances of meaning embedded in language. It’s truly fascinating technology, offering immense potential to enhance both our minds and knowledge vaults!
∂</details>

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
- **Automatic Note Linking**: The plugin analyzes your notes' content to suggest contextually related notes, without requiring manual tags or links.
- **Easy Navigation**: Quickly access related notes in the sidebar to deepen your understanding and make connections across your knowledge.

## Installation

1. Open Obsidian and go to **Settings > Community plugins**.
2. Click on **Browse** and search for "Related Notes Finder."
3. Click **Install** and then **Enable** the plugin.

Alternatively, you can clone this repository and place it in your Obsidian plugins folder:
```bash
git clone https://github.com/JoramMillenaar/related-notes.git
```

## Usage

1. With the plugin enabled, open any note in your Obsidian vault.
2. Use the command palette (press `Ctrl/Cmd + P`) and type "Show Related Notes" to view suggestions based on the current note's content.
3. Suggested notes will appear in the sidebar (or your preferred location), allowing you to explore related ideas and make new connections.

## Configuration

Go to **Settings > Related Notes Finder** to customize the plugin’s behavior:
- **Number of Related Notes**: Set how many notes to display as related.

## Privacy and Security

One of Obsidian's greatest strengths is its commitment to data ownership and privacy. This plugin upholds that philosophy by making privacy its highest priority. All processing and note relations happen entirely on your device, ensuring your notes stay yours—always. 

**Related Notes Finder** is built with privacy at its core:  
- **Local Processing**: Every analysis and operation occurs directly on your device. Your notes never leave your vault.  
- **No Third-Party Dependencies**: The plugin requires no internet access or external APIs, providing a fully private and secure experience.  

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

Contributions are always welcome! If you have ideas for improvements or new features, please open an issue or submit a pull request to start a discussion.  

This plugin relies on [relate-text](https://github.com/JoramMillenaar/relate-text) for much of its core logic. Contributions to this library are equally encouraged and will directly enhance the functionality of the plugin.

### TODO  
Here are the current development goals for the plugin:  
- Pass the note's title to the embedder as well (maybe even make it weighty)
- Kill the local API when Obsidian is quit (I've tried multiple ways, seems to be a challenge)
- Ensure the `onload` method is non-blocking by deferring data fetching to the `onLayoutReady` callback.  
- Add option to show notes to a similarity threshold, rather than a set amount of notes.
- Investigate using `this.app.metadataCache.getFileCache(file)` for file parsing instead of regex on raw content.  
- Find a more suitable template for extending the custom view.  
- Consider renaming the plugin to something like **Deeplink**, **Meaning Map**, **SmartLink**, or **Relate Notes**.  
- Look into and fix odd resuls in similarity after updating note embeddings
- Test windows compatibility

### License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

With **Related Notes Finder**, explore your knowledge in a new way—intelligently, locally, and privately.
