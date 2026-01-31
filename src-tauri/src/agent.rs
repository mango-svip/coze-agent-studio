use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub api_url: String,
    pub auth_token: String,
    pub project_id: String,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateAgentInput {
    pub name: String,
    pub api_url: String,
    pub auth_token: String,
    pub project_id: String,
}

impl Agent {
    pub fn new(input: CreateAgentInput) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: input.name,
            api_url: input.api_url,
            auth_token: input.auth_token,
            project_id: input.project_id,
            created_at: Utc::now().timestamp(),
        }
    }
    
    pub fn save(&self, conn: &Connection) -> Result<()> {
        conn.execute(
            "INSERT INTO agents (id, name, api_url, auth_token, project_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                &self.id,
                &self.name,
                &self.api_url,
                &self.auth_token,
                &self.project_id,
                &self.created_at
            ],
        )?;
        Ok(())
    }
    
    pub fn get_all(conn: &Connection) -> Result<Vec<Agent>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, api_url, auth_token, project_id, created_at 
             FROM agents 
             ORDER BY created_at DESC"
        )?;
        
        let agents = stmt.query_map([], |row| {
            Ok(Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                api_url: row.get(2)?,
                auth_token: row.get(3)?,
                project_id: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        
        Ok(agents)
    }
    
    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<Agent>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, api_url, auth_token, project_id, created_at 
             FROM agents 
             WHERE id = ?1"
        )?;
        
        let mut rows = stmt.query(params![id])?;
        
        if let Some(row) = rows.next()? {
            Ok(Some(Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                api_url: row.get(2)?,
                auth_token: row.get(3)?,
                project_id: row.get(4)?,
                created_at: row.get(5)?,
            }))
        } else {
            Ok(None)
        }
    }
    
    pub fn delete(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM agents WHERE id = ?1", params![id])?;
        Ok(())
    }
    
    pub fn update(&self, conn: &Connection) -> Result<()> {
        conn.execute(
            "UPDATE agents 
             SET name = ?1, api_url = ?2, auth_token = ?3, project_id = ?4
             WHERE id = ?5",
            params![
                &self.name,
                &self.api_url,
                &self.auth_token,
                &self.project_id,
                &self.id
            ],
        )?;
        Ok(())
    }
}
