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

```json
{
  "name": "gemini-chat-vsc",
  "displayName": "Gemini Chat VSC",
  "description": "AI Chat with Gemini API",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.101.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [],
  "main": "./extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "gemini-chat-container",
          "title": "Gemini Chat",
          "icon": "$(robot)"
        }
      ]
    },
    "views": {
      "gemini-chat-container": [
        {
          "id": "geminiChatView",
          "name": "Chat",
          "type": "webview",
          "when": "true",
          "icon": "$(robot)"
        }
      ]
    },
    "commands": [
      {
        "command": "geminiChat.openSettings",
        "title": "Open Settings",
        "category": "Gemini Chat"
      }
    ],
    "configuration": {
      "type": "object",
      "title": "Gemini Chat",
      "properties": {
        "geminiChat.apiKey": {
          "type": "string",
          "default": "",
          "description": "Your Google Gemini API key",
          "order": 1
        }
      }
    }
  },
  "scripts": {
    "lint": "eslint .",
    "pretest": "npm run lint",
    "test": "node ./test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.101.0",
    "@types/node": "20.x",
    "@typescript-eslint/eslint-plugin": "^6.4.1",
    "@typescript-eslint/parser": "^6.4.1",
    "eslint": "^8.47.0",
    "glob": "^10.3.3",
    "@vscode/test-electron": "^2.3.4"
  }
}
```

Replace the `src/extension.js` content with:

```js
const vscode = require('vscode');

let chatProvider;

function activate(context) {
    console.log('Gemini Chat extension is now active!');
    
    // Create the chat provider
    chatProvider = new GeminiChatProvider(context.extensionUri);
    
    // Register the webview provider with the correct view ID
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'geminiChatView', // This must match the view ID in package.json
            chatProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        )
    );
    
    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('geminiChat.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'geminiChat');
        })
    );
}

class GeminiChatProvider {
    constructor(extensionUri) {
        this._extensionUri = extensionUri;
        this._messages = [];
        this._currentModel = 'gemini-2.5-pro'; // Updated to use 2.5 Pro as default
        this._view = null;
    }

    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                await this._handleWebviewMessage(message);
            },
            undefined,
            []
        );
    }

    async _handleWebviewMessage(message) {
        switch (message.type) {
            case 'sendMessage':
                await this._sendMessage(message.message);
                break;
            case 'clearChat':
                this._clearChat();
                break;
            case 'changeModel':
                this._currentModel = message.model;
                break;
            case 'getApiKey':
                this._checkApiKey();
                break;
        }
    }

    async _sendMessage(content) {
        if (!content.trim()) return;

        const apiKey = vscode.workspace.getConfiguration('geminiChat').get('apiKey');
        if (!apiKey) {
            this._view.webview.postMessage({
                type: 'error',
                message: 'Please configure your Gemini API key in settings'
            });
            return;
        }

        // Add user message to session
        const userMessage = {
            role: 'user',
            content: content,
            timestamp: new Date().toISOString(),
            model: this._currentModel
        };
        this._messages.push(userMessage);

        // Update UI with user message
        this._view.webview.postMessage({
            type: 'userMessage',
            message: userMessage
        });

        // Show thinking indicator
        this._view.webview.postMessage({
            type: 'thinking',
            message: 'Thinking...'
        });

        try {
            const response = await this._callGeminiAPI(content, apiKey);
            
            // Add AI response to session
            const aiMessage = {
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
                model: this._currentModel
            };
            this._messages.push(aiMessage);

            // Update UI with AI response
            this._view.webview.postMessage({
                type: 'response',
                message: response
            });

        } catch (error) {
            console.error('Error calling Gemini API:', error);
            this._view.webview.postMessage({
                type: 'error',
                message: `Error: ${error.message}`
            });
        }
    }

    async _callGeminiAPI(userMessage, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this._currentModel}:generateContent?key=${apiKey}`;
        
        // Build conversation context
        const contents = this._messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
        
        // Add current user message
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;
    }

    _clearChat() {
        this._messages = [];
        this._view.webview.postMessage({
            type: 'clearChat'
        });
    }

    _checkApiKey() {
        const apiKey = vscode.workspace.getConfiguration('geminiChat').get('apiKey');
        this._view.webview.postMessage({
            type: 'apiKey',
            hasKey: !!apiKey
        });
    }

    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini Chat</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.0/marked.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-input-border);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .model-selector {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-foreground);
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
        }

        .clear-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }

        .clear-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .message {
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 90%;
            word-wrap: break-word;
            line-height: 1.4;
        }
        
        .user-message {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            align-self: flex-end;
            margin-left: auto;
            white-space: pre-wrap;
        }
        
        .ai-message {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            align-self: flex-start;
        }
        
        .ai-message h1, .ai-message h2, .ai-message h3, .ai-message h4, .ai-message h5, .ai-message h6 {
            color: var(--vscode-foreground);
            margin: 0.5em 0;
        }
        
        .ai-message p {
            margin: 0.5em 0;
            line-height: 1.6;
        }
        
        .ai-message ul, .ai-message ol {
            margin: 0.5em 0;
            padding-left: 20px;
        }
        
        .ai-message li {
            margin: 0.3em 0;
        }
        
        .ai-message code {
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }
        
        .ai-message pre {
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            border: 1px solid var(--vscode-input-border);
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            line-height: 1.4;
            position: relative;
        }
        
        .code-block-container {
            position: relative;
            margin: 0.5em 0;
        }
        
        .copy-button {
            position: absolute;
            top: 8px;
            right: 8px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .copy-button:hover {
            opacity: 1;
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .copy-button.copied {
            background-color: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
        }
        
        .ai-message pre code {
            background: none;
            padding: 0;
            border-radius: 0;
        }
        
        .ai-message blockquote {
            border-left: 4px solid var(--vscode-textLink-foreground);
            margin: 0.5em 0;
            padding-left: 10px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        
        .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            align-self: flex-start;
            white-space: pre-wrap;
        }
        
        .thinking {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            align-self: flex-start;
        }
        
        .input-container {
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
        }
        
        .input-box {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        
        #messageInput {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-family: inherit;
            font-size: inherit;
            resize: none;
            min-height: 20px;
            max-height: 120px;
            overflow-y: auto;
            line-height: 1.4;
        }
        
        #sendButton {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            white-space: nowrap;
            min-width: 60px;
        }
        
        #sendButton:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        #sendButton:disabled {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
        }
        
        .settings-notice {
            background-color: var(--vscode-inputValidation-warningBackground);
            color: var(--vscode-inputValidation-warningForeground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            padding: 12px;
            margin: 10px;
            border-radius: 4px;
            text-align: center;
        }
        
        .settings-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 8px;
        }
        
        .welcome-message {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .welcome-message h3 {
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        
        .welcome-message p {
            margin: 5px 0;
            font-size: 0.9em;
        }
        
        .timestamp {
            font-size: 10px;
            opacity: 0.7;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <select class="model-selector" id="modelSelector">
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro" selected>Gemini 2.5 Pro</option>
        </select>
        <button class="clear-btn" onclick="clearChat()">Clear Chat</button>
    </div>

    <div class="chat-container" id="chatContainer">
        <div class="welcome-message">
            <h3>🤖 Gemini Chat</h3>
            <p>Welcome to your AI assistant!</p>
            <p>Ask me anything and I'll help you out.</p>
        </div>
    </div>
    
    <div class="settings-notice" id="settingsNotice" style="display: none;">
        <div>⚠️ API Key Required</div>
        <div>Please set your Gemini API key in the extension settings to start chatting.</div>
        <button class="settings-button" onclick="openSettings()">Open Settings</button>
    </div>
    
    <div class="input-container">
        <div class="input-box">
            <textarea id="messageInput" placeholder="Type your message..." rows="1"></textarea>
            <button id="sendButton" onclick="sendMessage()">Send</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        let isWaitingForResponse = false;
        
        // Configure marked for better rendering
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true
            });
        }
        
        // Check for API key on load
        window.addEventListener('load', () => {
            vscode.postMessage({ type: 'getApiKey' });
        });
        
        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'userMessage':
                    addMessage(message.message.content, 'user-message', false);
                    break;
                case 'response':
                    addMessage(message.message, 'ai-message', true);
                    isWaitingForResponse = false;
                    updateSendButton();
                    break;
                case 'error':
                    addMessage(message.message, 'error-message', false);
                    isWaitingForResponse = false;
                    updateSendButton();
                    break;
                case 'thinking':
                    addMessage(message.message, 'thinking', false);
                    break;
                case 'apiKey':
                    handleApiKeyStatus(message.hasKey);
                    break;
                case 'clearChat':
                    document.getElementById('chatContainer').innerHTML = \`
                        <div class="welcome-message">
                            <h3>🤖 Gemini Chat</h3>
                            <p>Welcome to your AI assistant!</p>
                            <p>Ask me anything and I'll help you out.</p>
                        </div>
                    \`;
                    break;
            }
        });
        
        function handleApiKeyStatus(hasKey) {
            const settingsNotice = document.getElementById('settingsNotice');
            const messageInput = document.getElementById('messageInput');
            const sendButton = document.getElementById('sendButton');
            
            if (hasKey) {
                settingsNotice.style.display = 'none';
                messageInput.disabled = false;
                sendButton.disabled = false;
            } else {
                settingsNotice.style.display = 'block';
                messageInput.disabled = true;
                sendButton.disabled = true;
            }
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (message === '' || isWaitingForResponse) {
                return;
            }
            
            // Clear input and reset height
            input.value = '';
            input.style.height = 'auto';
            
            // Set waiting state
            isWaitingForResponse = true;
            updateSendButton();
            
            // Send message to extension
            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });
        }
        
        function addMessage(text, className, isMarkdown) {
            const chatContainer = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${className}\`;
            
            if (isMarkdown && typeof marked !== 'undefined') {
                messageDiv.innerHTML = marked.parse(text);
                
                // Add copy buttons to code blocks
                if (className === 'ai-message') {
                    addCopyButtonsToCodeBlocks(messageDiv);
                }
            } else {
                messageDiv.textContent = text;
            }

            // Add timestamp for user and AI messages
            if (className === 'user-message' || className === 'ai-message') {
                const timestampDiv = document.createElement('div');
                timestampDiv.className = 'timestamp';
                timestampDiv.textContent = new Date().toLocaleTimeString();
                messageDiv.appendChild(timestampDiv);
            }
            
            chatContainer.appendChild(messageDiv);
            
            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        function addCopyButtonsToCodeBlocks(messageDiv) {
            const codeBlocks = messageDiv.querySelectorAll('pre code');
            codeBlocks.forEach(codeBlock => {
                const pre = codeBlock.parentNode;
                const container = document.createElement('div');
                container.className = 'code-block-container';
                
                // Move the pre element into the container
                pre.parentNode.insertBefore(container, pre);
                container.appendChild(pre);
                
                // Create copy button
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-button';
                copyButton.textContent = 'Copy';
                copyButton.onclick = () => copyToClipboard(codeBlock.textContent, copyButton);
                
                container.appendChild(copyButton);
            });
        }
        
        function copyToClipboard(text, button) {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                button.textContent = 'Failed';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            });
        }
        
        function updateSendButton() {
            const sendButton = document.getElementById('sendButton');
            sendButton.disabled = isWaitingForResponse;
            sendButton.textContent = isWaitingForResponse ? 'Sending...' : 'Send';
        }
        
        function clearChat() {
            vscode.postMessage({ type: 'clearChat' });
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        // Auto-resize textarea
        function autoResize() {
            const textarea = document.getElementById('messageInput');
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
        
        // Handle Enter key in textarea
        document.getElementById('messageInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Handle input changes for auto-resize
        document.getElementById('messageInput').addEventListener('input', autoResize);
        
        // Handle model selection change
        document.getElementById('modelSelector').addEventListener('change', (e) => {
            vscode.postMessage({
                type: 'changeModel',
                model: e.target.value
            });
        });
    </script>
</body>
</html>\`;
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
```

Update the README.md content with this complete documentation.

### Step 4: Test the Extension

1. Open the folder in VS Code
2. Open integrated terminal and run:
   ```bash
   npm run compile
   ```
3. Press `F5` - A new VS Code window will appear with your extension

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