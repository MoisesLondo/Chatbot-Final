import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AskPayload, AskResponse, HistoryResp } from '../models';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://127.0.0.1:8000'
  private http = inject(HttpClient)

  askToBot(payload: AskPayload): Observable<AskResponse> {
    return this.http.post<AskResponse>(`${this.apiUrl}/ask`, {
      query: payload.query,
      session_id: payload.session_id
    });
  }

  getHistory(sessionId: string): Observable<HistoryResp> {
    return this.http.post<HistoryResp>(`${this.apiUrl}/history`, {
      session_id: sessionId
    });
  }
}
