use rusqlite::{Connection, Result};
use tauri::{AppHandle, Manager};

pub fn init_db(app: &AppHandle) -> Result<Connection> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");
    
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
    
    let db_path = app_dir.join("coze_studio.db");
    let conn = Connection::open(db_path)?;
    
    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    
    create_tables(&conn)?;
    
    Ok(conn)
}

fn create_tables(conn: &Connection) -> Result<()> {
    // Agents table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            api_url TEXT NOT NULL,
            auth_token TEXT NOT NULL,
            project_id TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;
    
    // Conversations table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            title TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // Messages table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            tool_calls TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Migration: ensure tool_calls column exists
    let _ = conn.execute("ALTER TABLE messages ADD COLUMN tool_calls TEXT", []);
    
    Ok(())
}

pub fn get_db_connection(app: &AppHandle) -> Result<Connection> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");
    
    let db_path = app_dir.join("coze_studio.db");
    let conn = Connection::open(db_path)?;
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    Ok(conn)
}
