
export interface HistoryEntry{ 
    type: 'human' | 'ai'; 
    content: string; 
    // timestamp?: string; 
}
export interface HistoryResp { 
    session_id: string; 
    history: HistoryEntry[]; 
}