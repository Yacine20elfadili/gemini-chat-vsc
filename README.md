# Gemini Chat VSC

A VS Code extension that integrates Google's Gemini AI models into your editor with a complete chat interface and conversation management system.

## Features

- 🤖 **Multiple Gemini Models**: Support for Gemini 2.0 Flash, 2.5 Flash, and 2.5 Pro
- 💬 **Chat Interface**: Clean, intuitive chat interface in the VS Code sidebar
- 🎨 **Theme Integration**: Fully integrated with VS Code's theme system
- 📝 **Markdown Support**: Full markdown rendering for AI responses with syntax highlighting
- 🔄 **Session Management**: Maintains conversation context during your coding session
- ⚡ **Real-time Responses**: Fast, streaming-like experience with loading indicators
- 🛠️ **Easy Configuration**: Simple API key setup through VS Code settings

## Installation

1. Clone or download this extension
2. Open the folder in VS Code
3. Press `F5` to run the extension in a new Extension Development Host window
4. Or package it: `vsce package` and install the `.vsix` file

## Setup

1. **Get a Gemini API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

2. **Configure the Extension**:
   - Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
   - Search for "Gemini Chat"
   - Enter your API key in the "Api Key" field
   - Or use the settings link in the chat interface

## Usage

1. **Open the Chat Interface**:
   - Click the robot icon in the Activity Bar
   - The Gemini Chat panel will appear in the sidebar

2. **Start Chatting**:
   - Type your message in the input field
   - Press `Enter` to send (or `Shift+Enter` for new lines)
   - The AI will respond with helpful information

3. **Switch Models**:
   - Use the dropdown in the header to switch between:
     - Gemini 2.0 Flash (fastest)
     - Gemini 2.5 Flash (balanced)
     - Gemini 2.5 Pro (most capable, default)

4. **Manage Conversations**:
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

## License

This project is licensed under the MIT License.

## Privacy

This extension:
- Only stores your API key locally in VS Code settings
- Sends conversation data to Google's Gemini API
- Does not store conversations permanently
- Does not collect or transmit any personal data beyond what's necessary for the AI chat functionality

## Support

For issues and feature requests, please create an issue in the project repository.

---

**Happy Coding with Gemini! 🚀**