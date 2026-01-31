mod db;
mod agent;
mod chat;

use tauri::AppHandle;
use std::sync::Mutex;
use rusqlite::params;
use agent::{Agent, CreateAgentInput};
use chat::{Conversation, Message, send_message_to_coze_streaming};

struct AppState {
    db_initialized: Mutex<bool>,
}

#[tauri::command]
async fn initialize_db(app: AppHandle) -> Result<(), String> {
    db::init_db(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn create_agent(app: AppHandle, input: CreateAgentInput) -> Result<Agent, String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    let agent = Agent::new(input);
    agent.save(&conn).map_err(|e| e.to_string())?;
    Ok(agent)
}

#[tauri::command]
async fn get_agents(app: AppHandle) -> Result<Vec<Agent>, String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    Agent::get_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_agent(app: AppHandle, id: String) -> Result<Option<Agent>, String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    Agent::get_by_id(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_agent(app: AppHandle, agent: Agent) -> Result<(), String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    agent.update(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_agent(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    Agent::delete(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_conversation(app: AppHandle, agent_id: String, title: Option<String>) -> Result<Conversation, String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    let conversation = Conversation::new(agent_id, title);
    conversation.save(&conn).map_err(|e| e.to_string())?;
    Ok(conversation)
}

#[tauri::command]
async fn get_conversations(app: AppHandle, agent_id: String) -> Result<Vec<Conversation>, String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    Conversation::get_by_agent(&conn, &agent_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_conversation(app: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    Conversation::delete(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_conversation(app: AppHandle, conversation: Conversation) -> Result<(), String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    conversation.update(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_conversation_markdown(app: AppHandle, conversation_id: String) -> Result<String, String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    
    // Get conversation details
    let conversations = Conversation::get_by_agent(&conn, "")
        .map_err(|e| e.to_string())?;
    let conversation = conversations.iter()
        .find(|c| c.id == conversation_id)
        .ok_or("Conversation not found")?;
    
    // Get messages
    let messages = Message::get_by_conversation(&conn, &conversation_id)
        .map_err(|e| e.to_string())?;
    
    // Build markdown
    let mut markdown = String::new();
    markdown.push_str(&format!("# {}\n\n", conversation.title.as_ref().unwrap_or(&"Untitled Conversation".to_string())));
    markdown.push_str(&format!("Created: {}\n\n", conversation.created_at));
    markdown.push_str("---\n\n");
    
    for msg in messages {
        let role = if msg.role == "user" { "**You**" } else { "**Assistant**" };
        markdown.push_str(&format!("### {}\n\n", role));
        markdown.push_str(&format!("{}\n\n", msg.content));
        markdown.push_str("---\n\n");
    }
    
    Ok(markdown)
}

#[tauri::command]
async fn save_message(app: AppHandle, conversation_id: String, role: String, content: String) -> Result<Message, String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    let message = Message::new(conversation_id, role, content, None);
    message.save(&conn).map_err(|e| e.to_string())?;
    Ok(message)
}

#[tauri::command]
async fn get_messages(app: AppHandle, conversation_id: String) -> Result<Vec<Message>, String> {
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    Message::get_by_conversation(&conn, &conversation_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn send_chat_message(
    app: AppHandle,
    agent_id: String,
    conversation_id: String,
    message: String,
) -> Result<String, String> {
    // Get agent details
    let conn = db::get_db_connection(&app).map_err(|e| e.to_string())?;
    let agent = Agent::get_by_id(&conn, &agent_id)
        .map_err(|e| e.to_string())?
        .ok_or("Agent not found")?;
    
    // Save user message
    let user_msg = Message::new(conversation_id.clone(), "user".to_string(), message.clone(), None);
    user_msg.save(&conn).map_err(|e| e.to_string())?;
    
    // Send to Coze API with streaming
    let (response, title, tool_calls) = send_message_to_coze_streaming(
        &app,
        &agent.api_url,
        &agent.auth_token,
        &agent.project_id,
        &message,
    )
    .await
    .map_err(|e| e.to_string())?;
    
    // Save assistant response
    let assistant_msg = Message::new(conversation_id.clone(), "assistant".to_string(), response.clone(), tool_calls);
    assistant_msg.save(&conn).map_err(|e| e.to_string())?;

    // Update conversation title if provided OR if it's currently untitled
    let mut final_title = title;
    
    // If no title from AI, check if we should auto-generate from the first user message
    if final_title.is_none() {
        let mut stmt = conn.prepare("SELECT title FROM conversations WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let current_title: Option<String> = stmt.query_row(params![conversation_id], |row| row.get(0))
            .map_err(|e| e.to_string())?;
            
        if current_title.is_none() || current_title == Some("Untitled Conversation".to_string()) {
            // Generate title from message (first 30 chars)
            let mut fallback = message.chars().take(30).collect::<String>();
            if message.chars().count() > 30 {
                fallback.push_str("...");
            }
            final_title = Some(fallback);
        }
    }

    if let Some(new_title) = final_title {
        let mut stmt = conn.prepare("UPDATE conversations SET title = ?1 WHERE id = ?2")
            .map_err(|e| e.to_string())?;
        stmt.execute(params![new_title, conversation_id])
            .map_err(|e| e.to_string())?;
    }
    
    Ok(response)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database on startup
            db::init_db(&app.handle()).expect("Failed to initialize database");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initialize_db,
            create_agent,
            get_agents,
            get_agent,
            update_agent,
            delete_agent,
            create_conversation,
            get_conversations,
            delete_conversation,
            update_conversation,
            export_conversation_markdown,
            save_message,
            get_messages,
            send_chat_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
