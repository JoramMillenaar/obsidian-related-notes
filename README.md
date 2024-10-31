# Related Notes

**Related Notes Finder** is an Obsidian plugin that intelligently suggests related notes, helping you uncover hidden connections and insights within your knowledge vault. Built with privacy in mind, this plugin operates entirely on your local device—your data stays private and secure.

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
- **Easy Navigation**: Quickly access related notes in a sidebar or pop-up to deepen your understanding and make connections across your knowledge.
- **Customization Options**: Configure how many related notes are suggested, relevance thresholds, and more.

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
- **Relevance Threshold**: Adjust the similarity threshold to fine-tune which notes are shown.
- **Appearance**: Choose where related notes appear (e.g., sidebar, pop-up, or inline).

## Privacy and Security

Related Notes Finder is designed with privacy as a top priority:
- **Local Processing**: All note analysis and processing are done on your device. No data is sent outside your vault.
- **No Third-Party Dependencies**: The plugin does not require any internet access or external API, ensuring a completely private experience.

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

Contributions are welcome! Please submit an issue or pull request to discuss improvements or suggest new features.

---

### License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

With **Related Notes Finder**, explore your knowledge in a new way—intelligently, locally, and privately.
