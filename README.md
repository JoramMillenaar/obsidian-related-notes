# Similarity

Find notes with similar meaning intelligently, helping you uncover hidden connections and insights within your Obsidian vault. Built with privacy in mind, this plugin operates entirely on your local device—your data stays private and secure.

![Screenshot](https://github.com/JoramMillenaar/obsidian-related-notes/raw/master/example.gif)


## Features

- **Fully Local and Private**: Your notes and data are never sent outside your device. All processing is done locally to ensure complete privacy.

## Install (Early Access via BRAT)

If this plugin isn’t available in Obsidian Community Plugins yet (or you want the latest build), you can install it directly from GitHub using **BRAT** (Beta Reviewers Auto-update Tool).

1. Open **Obsidian → Settings → Community plugins**
   - Turn off **Safe mode**
   - Click **Browse** and install **Obsidian42 - BRAT**
2. Enable **Obsidian42 - BRAT**
3. Open the **Command Palette** (`Ctrl/Cmd + P`) and run:  
   **BRAT: Add a beta plugin for testing**
4. When prompted, paste this repository URL: https://github.com/JoramMillenaar/obsidian-related-notes
5. After adding it, go to **Settings → Community plugins** and enable **Similarity**.

### Updating

To pull the latest changes from GitHub, open the Command Palette and run:  
**BRAT: Check for updates to all beta plugins and UPDATE**



## Usage

1. After enabling the plugin, a telescope icon will appear in the note’s right sidebar within a few seconds.
2. On first use, you’ll see a button to start indexing your vault.
3. Indexing can take anywhere from 1 to 20 minutes depending on your device and vault size, so it's not recommended to do this on mobile.
4. Once indexing is complete, open any note and click the telescope icon to see notes that are most similar in meaning.
5. Click any note in the list to navigate to it.
6. Use the refresh button to update the list of related notes.

## Privacy and Security

One of Obsidian's greatest strengths is its commitment to data ownership and privacy. This plugin upholds that philosophy by making privacy its highest priority. All processing and note relations happen entirely on your device, ensuring your notes stay yours—always. 

**Similarity** is built with privacy at its core:  
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


### License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

With **Similarity**, explore your knowledge in a new way—intelligently, locally, and privately.
