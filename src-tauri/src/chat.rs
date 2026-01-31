use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection, Result as SqlResult};
use uuid::Uuid;
use chrono::Utc;
use reqwest::Client;
use futures::StreamExt;
use std::error::Error;
use tauri::{AppHandle, Emitter};

// Event payload for streaming responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamEvent {
    pub event_type: String, // "content", "tool_call", "tool_result", "done", "error"
    pub content: Option<String>,
    pub tool_call: Option<ToolCall>,
    pub full_content: Option<String>,
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String, // "user" or "assistant"
    pub content: String,
    pub tool_calls: Option<Vec<ToolCall>>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub tool_name: String,
    pub tool_input: String,
    pub tool_output: Option<String>,
    pub status: String, // "running", "success", "error"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub agent_id: String,
    pub title: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CozeRequest {
    pub content: CozeContent,
    #[serde(rename = "type")]
    pub request_type: String,
    pub project_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CozeContent {
    pub query: CozeQuery,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CozeQuery {
    pub prompt: Vec<CozePrompt>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CozePrompt {
    #[serde(rename = "type")]
    pub prompt_type: String,
    pub content: CozePromptContent,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CozePromptContent {
    pub text: String,
}


impl Message {
    pub fn new(conversation_id: String, role: String, content: String, tool_calls: Option<Vec<ToolCall>>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            conversation_id,
            role,
            content,
            tool_calls,
            created_at: Utc::now().timestamp(),
        }
    }
    
    pub fn save(&self, conn: &Connection) -> SqlResult<()> {
        let tool_calls_json = self.tool_calls.as_ref().map(|tc| serde_json::to_string(tc).unwrap_or_default());
        conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, tool_calls, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                &self.id,
                &self.conversation_id,
                &self.role,
                &self.content,
                &tool_calls_json,
                &self.created_at
            ],
        )?;
        Ok(())
    }
    
    pub fn get_by_conversation(conn: &Connection, conversation_id: &str) -> SqlResult<Vec<Message>> {
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, tool_calls, created_at 
             FROM messages 
             WHERE conversation_id = ?1 
             ORDER BY created_at ASC"
        )?;
        
        let messages = stmt.query_map(params![conversation_id], |row| {
            let tool_calls_json: Option<String> = row.get(4)?;
            let tool_calls = tool_calls_json.and_then(|json| serde_json::from_str(&json).ok());
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                tool_calls,
                created_at: row.get(5)?,
            })
        })?
        .collect::<SqlResult<Vec<_>, _>>()?;
        
        Ok(messages)
    }
}

impl Conversation {
    pub fn new(agent_id: String, title: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            agent_id,
            title,
            created_at: Utc::now().timestamp(),
        }
    }
    
    pub fn save(&self, conn: &Connection) -> SqlResult<()> {
        conn.execute(
            "INSERT INTO conversations (id, agent_id, title, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                &self.id,
                &self.agent_id,
                &self.title,
                &self.created_at
            ],
        )?;
        Ok(())
    }
    
    pub fn get_by_agent(conn: &Connection, agent_id: &str) -> SqlResult<Vec<Conversation>> {
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, title, created_at 
             FROM conversations 
             WHERE agent_id = ?1 
             ORDER BY created_at DESC"
        )?;
        
        let conversations = stmt.query_map(params![agent_id], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                title: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?
        .collect::<SqlResult<Vec<_>, _>>()?;
        
        Ok(conversations)
    }
    
    pub fn delete(conn: &Connection, id: &str) -> SqlResult<()> {
        conn.execute("DELETE FROM conversations WHERE id = ?1", params![id])?;
        Ok(())
    }
    
    pub fn update(&self, conn: &Connection) -> SqlResult<()> {
        conn.execute(
            "UPDATE conversations 
             SET title = ?1
             WHERE id = ?2",
            params![
                &self.title,
                &self.id
            ],
        )?;
        Ok(())
    }
}

#[allow(dead_code)]
pub async fn send_message_to_coze(
    api_url: &str,
    auth_token: &str,
    project_id: &str,
    message: &str,
) -> Result<(String, Option<String>, Option<Vec<ToolCall>>), Box<dyn Error>> {
    let client = Client::new();
    
    let request = CozeRequest {
        content: CozeContent {
            query: CozeQuery {
                prompt: vec![CozePrompt {
                    prompt_type: "text".to_string(),
                    content: CozePromptContent {
                        text: message.to_string(),
                    },
                }],
            },
        },
        request_type: "query".to_string(),
        project_id: project_id.to_string(),
    };
    
    let response = client
        .post(api_url)
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Err(format!("API request failed: {}", response.status()).into());
    }
    
    let mut stream = response.bytes_stream();
    let mut full_response = String::new();
    let mut title = None;
    let mut tool_calls: Vec<ToolCall> = Vec::new();
    
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);
        
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].to_string();
            let remaining = buffer[pos + 1..].to_string();
            buffer = remaining;
            
            let line = line.trim();
            if line.starts_with("data: ") {
                let json_str = &line[6..]; // Remove "data: " prefix
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
                    // Try to extract answer from various places
                    if let Some(answer) = v.get("answer").and_then(|a| a.as_str()) {
                        full_response.push_str(answer);
                    } else if let Some(content) = v.get("content") {
                        if let Some(answer) = content.get("answer").and_then(|a| a.as_str()) {
                            full_response.push_str(answer);
                        } else if let Some(answer) = content.as_str() {
                            // If the whole content is a string and no other specific fields match, 
                            // check message type to decide if it's answer text
                            if v.get("type").and_then(|t| t.as_str()) == Some("answer") || 
                               v.get("role").and_then(|r| r.as_str()) == Some("assistant") {
                                full_response.push_str(answer);
                            }
                        }
                    }
                    
                    // Extract title
                    if let Some(t) = v.get("title").and_then(|t| t.as_str()) {
                        println!("Found title in root: {}", t);
                        title = Some(t.to_string());
                    } else if v.get("type").and_then(|t| t.as_str()) == Some("title") {
                        if let Some(t) = v.get("content").and_then(|c| c.as_str()) {
                            println!("Found title in content as string (type=title): {}", t);
                            title = Some(t.to_string());
                        }
                    } else if let Some(content) = v.get("content") {
                        if let Some(t) = content.get("title").and_then(|t| t.as_str()) {
                            println!("Found title in content object: {}", t);
                            title = Some(t.to_string());
                        }
                    }
                    
                    // Check message type for tool_request and tool_response
                    let msg_type = v.get("type").and_then(|t| t.as_str()).unwrap_or("");
                    
                    // Handle tool_request type (Coze API format)
                    if msg_type == "tool_request" {
                        if let Some(content) = v.get("content") {
                            if let Some(tool_req) = content.get("tool_request") {
                                if let Some(tool_id) = tool_req.get("tool_call_id").and_then(|v| v.as_str()) {
                                    let tool_name = tool_req.get("tool_name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                                    let tool_input = tool_req.get("parameters")
                                        .map(|p| serde_json::to_string_pretty(p).unwrap_or_default())
                                        .unwrap_or_default();
                                    
                                    if !tool_calls.iter().any(|tc| tc.id == tool_id) {
                                        tool_calls.push(ToolCall {
                                            id: tool_id.to_string(),
                                            tool_name,
                                            tool_input,
                                            tool_output: None,
                                            status: "running".to_string(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                    
                    // Handle tool_response type (Coze API format)
                    if msg_type == "tool_response" {
                        if let Some(content) = v.get("content") {
                            if let Some(tool_res) = content.get("tool_response") {
                                if let Some(tool_id) = tool_res.get("tool_call_id").and_then(|v| v.as_str()) {
                                    let code = tool_res.get("code").and_then(|c| c.as_str()).unwrap_or("0");
                                    let status = if code == "0" { "success" } else { "error" };
                                    
                                    // Get result, truncate if extremely long
                                    let result = tool_res.get("result")
                                        .and_then(|r| r.as_str())
                                        .map(|s| {
                                            if s.len() > 1_000_000 {
                                                format!("{}...(truncated)", &s[..1_000_000])
                                            } else {
                                                s.to_string()
                                            }
                                        });
                                    
                                    if let Some(tc) = tool_calls.iter_mut().find(|tc| tc.id == tool_id) {
                                        tc.status = status.to_string();
                                        tc.tool_output = result;
                                    }
                                }
                            }
                        }
                    }
                    
                    // Also handle legacy tool_calls array format
                    let search_targets = vec![&v, if v.get("content").map_or(false, |c| c.is_object()) { v.get("content").unwrap() } else { &serde_json::Value::Null }];
                    
                    for target in search_targets {
                        if target.is_null() { continue; }
                        
                        // Handle tool calls array
                        if let Some(calls) = target.get("tool_calls").and_then(|c| c.as_array()) {
                            for tool_call_val in calls {
                                if let Some(tool_id) = tool_call_val.get("id").and_then(|v| v.as_str()) {
                                    let tool_name = tool_call_val.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                                    let tool_input = tool_call_val.get("args").map(|v| v.to_string()).unwrap_or_default();
                                    
                                    if !tool_calls.iter().any(|tc| tc.id == tool_id) {
                                        tool_calls.push(ToolCall {
                                            id: tool_id.to_string(),
                                            tool_name,
                                            tool_input,
                                            tool_output: None,
                                            status: "running".to_string(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    let tool_calls_opt = if tool_calls.is_empty() { None } else { Some(tool_calls) };
    Ok((full_response, title, tool_calls_opt))
}

/// Streaming version that emits events as content arrives
pub async fn send_message_to_coze_streaming(
    app: &AppHandle,
    api_url: &str,
    auth_token: &str,
    project_id: &str,
    message: &str,
) -> Result<(String, Option<String>, Option<Vec<ToolCall>>), Box<dyn Error + Send + Sync>> {
    let client = Client::new();
    
    let request = CozeRequest {
        content: CozeContent {
            query: CozeQuery {
                prompt: vec![CozePrompt {
                    prompt_type: "text".to_string(),
                    content: CozePromptContent {
                        text: message.to_string(),
                    },
                }],
            },
        },
        request_type: "query".to_string(),
        project_id: project_id.to_string(),
    };
    
    let response = client
        .post(api_url)
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let _ = app.emit("chat-stream", StreamEvent {
            event_type: "error".to_string(),
            content: Some(format!("API request failed: {}", response.status())),
            tool_call: None,
            full_content: None,
            tool_calls: None,
        });
        return Err(format!("API request failed: {}", response.status()).into());
    }
    
    let mut stream = response.bytes_stream();
    let mut full_response = String::new();
    let mut title = None;
    let mut tool_calls: Vec<ToolCall> = Vec::new();
    
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);
        
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].to_string();
            let remaining = buffer[pos + 1..].to_string();
            buffer = remaining;
            
            let line = line.trim();
            if line.starts_with("data: ") {
                let json_str = &line[6..]; // Remove "data: " prefix
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
                    let msg_type = v.get("type").and_then(|t| t.as_str()).unwrap_or("");
                    
                    // Extract answer content and emit streaming event
                    let mut chunk_content: Option<String> = None;
                    
                    if let Some(answer) = v.get("answer").and_then(|a| a.as_str()) {
                        chunk_content = Some(answer.to_string());
                        full_response.push_str(answer);
                    } else if let Some(content) = v.get("content") {
                        if let Some(answer) = content.get("answer").and_then(|a| a.as_str()) {
                            chunk_content = Some(answer.to_string());
                            full_response.push_str(answer);
                        } else if let Some(answer) = content.as_str() {
                            if msg_type == "answer" || v.get("role").and_then(|r| r.as_str()) == Some("assistant") {
                                chunk_content = Some(answer.to_string());
                                full_response.push_str(answer);
                            }
                        }
                    }
                    
                    // Emit content event if we have new content
                    if let Some(content) = chunk_content {
                        if !content.is_empty() {
                            let _ = app.emit("chat-stream", StreamEvent {
                                event_type: "content".to_string(),
                                content: Some(content),
                                tool_call: None,
                                full_content: Some(full_response.clone()),
                                tool_calls: None,
                            });
                        }
                    }
                    
                    // Extract title
                    if let Some(t) = v.get("title").and_then(|t| t.as_str()) {
                        title = Some(t.to_string());
                    } else if msg_type == "title" {
                        if let Some(t) = v.get("content").and_then(|c| c.as_str()) {
                            title = Some(t.to_string());
                        }
                    } else if let Some(content) = v.get("content") {
                        if let Some(t) = content.get("title").and_then(|t| t.as_str()) {
                            title = Some(t.to_string());
                        }
                    }
                    
                    // Handle tool_request type
                    if msg_type == "tool_request" {
                        if let Some(content) = v.get("content") {
                            if let Some(tool_req) = content.get("tool_request") {
                                if let Some(tool_id) = tool_req.get("tool_call_id").and_then(|v| v.as_str()) {
                                    let tool_name = tool_req.get("tool_name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                                    let tool_input = tool_req.get("parameters")
                                        .map(|p| serde_json::to_string_pretty(p).unwrap_or_default())
                                        .unwrap_or_default();
                                    
                                    if !tool_calls.iter().any(|tc| tc.id == tool_id) {
                                        let new_tool_call = ToolCall {
                                            id: tool_id.to_string(),
                                            tool_name,
                                            tool_input,
                                            tool_output: None,
                                            status: "running".to_string(),
                                        };
                                        
                                        // Emit tool call event
                                        let _ = app.emit("chat-stream", StreamEvent {
                                            event_type: "tool_call".to_string(),
                                            content: None,
                                            tool_call: Some(new_tool_call.clone()),
                                            full_content: None,
                                            tool_calls: None,
                                        });
                                        
                                        tool_calls.push(new_tool_call);
                                    }
                                }
                            }
                        }
                    }
                    
                    // Handle tool_response type
                    if msg_type == "tool_response" {
                        if let Some(content) = v.get("content") {
                            if let Some(tool_res) = content.get("tool_response") {
                                if let Some(tool_id) = tool_res.get("tool_call_id").and_then(|v| v.as_str()) {
                                    let code = tool_res.get("code").and_then(|c| c.as_str()).unwrap_or("0");
                                    let status = if code == "0" { "success" } else { "error" };
                                    
                                    let result = tool_res.get("result")
                                        .and_then(|r| r.as_str())
                                        .map(|s| {
                                            if s.len() > 1_000_000 {
                                                format!("{}...(truncated)", &s[..1_000_000])
                                            } else {
                                                s.to_string()
                                            }
                                        });
                                    
                                    if let Some(tc) = tool_calls.iter_mut().find(|tc| tc.id == tool_id) {
                                        tc.status = status.to_string();
                                        tc.tool_output = result;
                                        
                                        // Emit tool result event
                                        let _ = app.emit("chat-stream", StreamEvent {
                                            event_type: "tool_result".to_string(),
                                            content: None,
                                            tool_call: Some(tc.clone()),
                                            full_content: None,
                                            tool_calls: Some(tool_calls.clone()),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Emit done event
    let tool_calls_opt = if tool_calls.is_empty() { None } else { Some(tool_calls.clone()) };
    let _ = app.emit("chat-stream", StreamEvent {
        event_type: "done".to_string(),
        content: None,
        tool_call: None,
        full_content: Some(full_response.clone()),
        tool_calls: tool_calls_opt.clone(),
    });
    
    Ok((full_response, title, tool_calls_opt))
}
