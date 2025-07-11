export interface AskPayload {
  query: string;
  session_id: string;
}

export interface AskResponse {
  input: string;
  content: string;
}