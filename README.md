# Coze Agent Studio

A beautiful, Claude Desktop-inspired desktop application for managing and chatting with Coze AI agents.

![Coze Studio](/.gemini/antigravity/brain/d1912448-1aa8-4181-8437-8695d69bd539/coze_agent_studio_initial_1769842720796.png)

## Features

- 🎨 **Modern Dark Theme** - Claude Desktop-inspired interface
- 🤖 **Multi-Agent Support** - Manage multiple Coze agents
- 💬 **Real-time Streaming** - Live streaming responses from Coze API
- 📝 **Markdown Rendering** - Full markdown support with code highlighting
- 💾 **Persistent Storage** - SQLite database for conversations and agents
- ⚡ **Native Performance** - Built with Tauri for near-native speed

## Tech Stack

- **Backend**: Rust + Tauri
- **Frontend**: React + TypeScript + Vite
- **Database**: SQLite (via rusqlite)
- **HTTP Client**: reqwest with streaming support
- **UI**: Vanilla CSS with modern design system

## Getting Started

### Prerequisites

- Node.js 18+ (or 20.19+/22.12+ for Vite 7)
- Rust and Cargo
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   cd coze-agent-studio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run tauri dev
   ```

4. Build for production:
   ```bash
   npm run tauri build
   ```

## Usage

### Adding a Coze Agent

1. Click the **+** button in the sidebar
2. Fill in your agent details:
   - **Agent Name**: A friendly name
   - **API URL**: Your Coze `stream_run` endpoint
   - **Authorization Token**: Your Coze API bearer token
   - **Project ID**: Your Coze project ID
3. Click **Add Agent**

### Chatting

1. Select an agent from the sidebar
2. Type your message and press `Enter`
3. Use `Shift + Enter` for multi-line messages
4. Watch responses stream in real-time

## Project Structure

```
coze-agent-studio/
├── src/                      # React frontend
│   ├── components/          # React components
│   │   ├── Sidebar.tsx
│   │   ├── ChatArea.tsx
│   │   ├── MessageBubble.tsx
│   │   └── AgentModal.tsx
│   ├── styles/              # CSS files
│   ├── types.ts             # TypeScript types
│   └── App.tsx              # Main app component
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── db.rs           # Database layer
│   │   ├── agent.rs        # Agent management
│   │   ├── chat.rs         # Chat functionality
│   │   └── lib.rs          # Tauri commands
│   └── Cargo.toml          # Rust dependencies
└── package.json            # Node dependencies
```

## API Integration

The app integrates with Coze's streaming API:

```bash
POST https://<your-domain>/stream_run
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "content": {
    "query": {
      "prompt": [
        {
          "type": "text",
          "content": {
            "text": "Your message"
          }
        }
      ]
    }
  },
  "type": "query",
  "project_id": "your_project_id"
}
```

## Database Schema

- **agents**: Store agent configurations
- **conversations**: Track conversations per agent
- **messages**: Store all chat messages

## Development

### Backend (Rust)

```bash
cd src-tauri
cargo build
cargo test
```

### Frontend (React)

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## License

MIT

## Acknowledgments

- Inspired by Claude Desktop's clean interface
- Built with [Tauri](https://tauri.app/)
- Powered by [Coze AI](https://coze.com/)
