# Gemini Chat VSC Extension

A VS Code extension that integrates Google's Gemini AI models into your editor with a complete chat interface and conversation management system.

## Features

- 🤖 **Multiple Gemini Models**: Support for Gemini 2.0 Flash, 2.5 Flash, and 2.5 Pro
- 💬 **Chat Interface**: Clean, intuitive chat interface in the VS Code sidebar
- 🎨 **Theme Integration**: Fully integrated with VS Code's theme system
- 📝 **Markdown Support**: Full markdown rendering for AI responses with syntax highlighting
- 🔄 **Session Management**: Maintains conversation context during your coding session
- ⚡ **Real-time Responses**: Fast, streaming-like experience with loading indicators
- 🛠️ **Easy Configuration**: Simple API key setup through VS Code settings

## Creating the Extension from Scratch

### Step 1: Set Up Development Environment

Create a new folder named `Chat_extension` and install the required tools:

```bash
# Install generator (run as administrator)
npm install -g yo generator-code
```

Navigate to where you want to create your extension (e.g., desktop) and run:

```bash
yo code
```

Answer the prompts as follows:

```
? What type of extension do you want to create? 
→ New Extension (JavaScript)

? What's the name of your extension? 
→ Gemini Chat Vsc

? What's the identifier of your extension? 
→ gemini-chat-vsc

? What's the description of your extension? 
→ AI Chat with Gemini API

? Initialize a git repository? 
→ No

? Package manager to use? 
→ npm
```

### Step 2: Project Structure

Your project will have these important files:

```
gemini-chat-vsc/
├── package.json          # Extension manifest
├── extension.js          # Main extension logic
├── README.md            # This file
└── .gitignore           # Git ignore rules
```

### Step 3: Configure the Extension

Replace the `package.json` content with:

[Go To package.json](https://github.com/Yacine20elfadili/gemini-chat-vsc/blob/main/package.json)

Replace the `extension.js` content with:

[Go To extension.js](https://github.com/Yacine20elfadili/gemini-chat-vsc/blob/main/extension.js)

Update the README.md content with this complete documentation.

### Step 4: Test the Extension

1. Open the folder in VS Code
2. Press `F5` - A new VS Code window will appear with your extension

**Note**: The extension will not work until you configure a Gemini API key.

## Installation & Setup

### Method 1: Development Mode

1. Clone or download this extension
2. Open the folder in VS Code
3. Press `F5` to run the extension in a new Extension Development Host window

### Method 2: Package and Install

#### Install VSCE (VSCode Extension Manager)

```bash
npm install -g vsce
```

#### Package Your Extension

Navigate to your extension's root directory and run:

```bash
vsce package
```

You will get two warnings - choose 'y' option for both. This creates a `.vsix` file (like `gemini-chat-0.0.1.vsix`).

#### Install the Extension

In VS Code:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type `Extensions: Install from VSIX`
3. Select your `.vsix` file
4. Restart VS Code

### Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. **Save it securely** - never share this key!

### Configure Your API Key

1. In VS Code, go to File → Preferences → Settings
2. Search for "gemini"
3. Find "Gemini Chat: Api Key"
4. Enter your Gemini API key
5. Go back to the Gemini Chat panel and start chatting!

## Usage

### Opening the Chat Interface

- Click the robot icon in the Activity Bar
- The Gemini Chat panel will appear in the sidebar

### Starting a Conversation

- Type your message in the input field
- Press `Enter` to send (or `Shift+Enter` for new lines)
- The AI will respond with helpful information

### Switching Models

Use the dropdown in the header to switch between:
- **Gemini 2.0 Flash** (fastest)
- **Gemini 2.5 Flash** (balanced)
- **Gemini 2.5 Pro** (most capable, default)

### Managing Conversations

- Click "Clear Chat" to start a new conversation
- Conversations persist during your VS Code session
- Context is maintained throughout the conversation

## Features in Detail

### Chat Interface
- **Responsive Design**: Works perfectly in VS Code's sidebar
- **Message Bubbles**: Clear distinction between user and AI messages
- **Timestamps**: Every message shows when it was sent
- **Auto-scroll**: Automatically scrolls to show new messages
- **Loading States**: Shows "Thinking..." indicator during AI responses

### Markdown Support
- **Code Blocks**: Syntax highlighted code blocks
- **Inline Code**: Styled inline code snippets
- **Headers**: Proper heading hierarchy
- **Lists**: Bulleted and numbered lists
- **Links**: Clickable links in responses
- **Blockquotes**: Styled quote blocks

### Model Selection
- **Gemini 2.0 Flash**: Ultra-fast responses, great for quick questions
- **Gemini 2.5 Flash**: Balanced speed and capability
- **Gemini 2.5 Pro**: Most advanced reasoning, best for complex tasks

### Session Management
- **In-Memory Storage**: Messages stored during current session
- **Context Preservation**: Full conversation history sent to AI
- **Easy Reset**: Clear chat functionality to start fresh
- **No File Persistence**: Privacy-focused approach

## Commands

- `Gemini Chat: Open Settings` - Opens the extension settings

## Configuration

The extension contributes the following settings:

- `geminiChat.apiKey`: Your Google Gemini API key (required)

## Development

### Project Structure
```
gemini-chat-vsc/
├── package.json          # Extension manifest
├── extension.js          # Main extension logic
├── README.md            # This file
└── .gitignore           # Git ignore rules
```

### Key Components
- **GeminiChatProvider**: Main webview provider class
- **Message Management**: Simple in-memory message array
- **API Integration**: Direct calls to Gemini API
- **UI State**: Reactive interface with VS Code theming

## Troubleshooting

### Common Issues

1. **"Please configure your Gemini API key"**
   - Go to VS Code Settings and add your API key
   - Make sure the key is valid and has API access enabled

2. **"Error: HTTP 403/401"**
   - Your API key may be invalid or expired
   - Check that the Gemini API is enabled in your Google Cloud project

3. **Extension not loading**
   - Check the Developer Console (`Help > Toggle Developer Tools`)
   - Look for any error messages in the console

4. **Chat interface not appearing**
   - Try reloading the window (`Developer: Reload Window`)
   - Check that the extension is properly activated

### Debug Mode

To debug the extension:
1. Press `F5` to open Extension Development Host
2. Open Developer Tools in the new window
3. Check Console for any errors
4. Use `console.log()` statements in the code for debugging

## Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Submitting pull requests
- Improving documentation

## Privacy

This extension:
- Only stores your API key locally in VS Code settings
- Sends conversation data to Google's Gemini API
- Does not store conversations permanently
- Does not collect or transmit any personal data beyond what's necessary for the AI chat functionality

## Support

For issues and feature requests, please create an issue in the project repository.

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Mohamed Yacine Elfadili**

- GitHub: [@Yacine20elfadili](https://github.com/Yacine20elfadili)

---

**Note**: This extension is for educational and legitimate research purposes. Please respect all terms of service and use responsibly.
