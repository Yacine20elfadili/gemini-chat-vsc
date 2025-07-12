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

        // Show typing indicator
        this._view.webview.postMessage({
            type: 'startTyping'
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

            // Start streaming the response
            this._streamResponse(response);

        } catch (error) {
            console.error('Error calling Gemini API:', error);
            this._view.webview.postMessage({
                type: 'error',
                message: `Error: ${error.message}`
            });
        }
    }

    _streamResponse(fullResponse) {
        const words = fullResponse.split(' ');
        let currentIndex = 0;
        
        // Initialize the streaming response
        this._view.webview.postMessage({
            type: 'startStreaming'
        });

        const streamInterval = setInterval(() => {
            if (currentIndex < words.length) {
                const wordsToAdd = Math.min(2, words.length - currentIndex); // Add 1-2 words at a time
                const chunk = words.slice(currentIndex, currentIndex + wordsToAdd).join(' ');
                
                this._view.webview.postMessage({
                    type: 'streamChunk',
                    chunk: chunk + (currentIndex + wordsToAdd < words.length ? ' ' : '')
                });
                
                currentIndex += wordsToAdd;
            } else {
                clearInterval(streamInterval);
                this._view.webview.postMessage({
                    type: 'endStreaming'
                });
            }
        }, 50); // Adjust speed here (50ms = 20 words per second)
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
        
        .typing-indicator {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            align-self: flex-start;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .typing-dots {
            display: flex;
            gap: 4px;
        }
        
        .typing-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: var(--vscode-descriptionForeground);
            animation: typing 1.4s infinite;
        }
        
        .typing-dot:nth-child(1) {
            animation-delay: 0s;
        }
        
        .typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.4;
            }
            30% {
                transform: translateY(-10px);
                opacity: 1;
            }
        }
        
        .streaming-message {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            align-self: flex-start;
            min-height: 20px;
        }
        
        .cursor-blink {
            animation: blink 1s infinite;
        }
        
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
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
        let currentStreamingMessage = null;
        let streamingContent = '';
        
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
                case 'startTyping':
                    showTypingIndicator();
                    break;
                case 'startStreaming':
                    startStreamingMessage();
                    break;
                case 'streamChunk':
                    appendToStreamingMessage(message.chunk);
                    break;
                case 'endStreaming':
                    finishStreamingMessage();
                    isWaitingForResponse = false;
                    updateSendButton();
                    break;
                case 'error':
                    removeTypingIndicator();
                    addMessage(message.message, 'error-message', false);
                    isWaitingForResponse = false;
                    updateSendButton();
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
        
        function showTypingIndicator() {
            const chatContainer = document.getElementById('chatContainer');
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message typing-indicator';
            typingDiv.id = 'typingIndicator';
            typingDiv.innerHTML = \`
                <span>Gemini is typing</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            \`;
            
            chatContainer.appendChild(typingDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        function removeTypingIndicator() {
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }
        
        function startStreamingMessage() {
            removeTypingIndicator();
            
            const chatContainer = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message streaming-message';
            messageDiv.id = 'streamingMessage';
            
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            currentStreamingMessage = messageDiv;
            streamingContent = '';
        }
        
        function appendToStreamingMessage(chunk) {
            if (currentStreamingMessage) {
                streamingContent += chunk;
                // Add cursor while streaming
                currentStreamingMessage.innerHTML = streamingContent + '<span class="cursor-blink">|</span>';
                
                // Scroll to bottom
                const chatContainer = document.getElementById('chatContainer');
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
        
        function finishStreamingMessage() {
            if (currentStreamingMessage) {
                // Remove cursor and apply final styling
                currentStreamingMessage.className = 'message ai-message';
                currentStreamingMessage.id = '';
                
                // Apply markdown rendering
                if (typeof marked !== 'undefined') {
                    currentStreamingMessage.innerHTML = marked.parse(streamingContent);
                    addCopyButtonsToCodeBlocks(currentStreamingMessage);
                } else {
                    currentStreamingMessage.innerHTML = streamingContent;
                }
                
                // Add timestamp
                const timestampDiv = document.createElement('div');
                timestampDiv.className = 'timestamp';
                timestampDiv.textContent = new Date().toLocaleTimeString();
                currentStreamingMessage.appendChild(timestampDiv);
                
                // Final scroll
                const chatContainer = document.getElementById('chatContainer');
                chatContainer.scrollTop = chatContainer.scrollHeight;
                
                // Reset streaming state
                currentStreamingMessage = null;
                streamingContent = '';
            }
        }
        
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
</html>`;
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};