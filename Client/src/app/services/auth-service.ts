import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../Models/ApiResponse';
import { environment } from '../environments/environment';
import { User } from '../Models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private url = `${environment.baseUrl}/api/account`;
  private token = 'token';

  constructor(private _httpClient: HttpClient) {}

  register(data: FormData): Observable<ApiResponse<string>> {
    return this._httpClient.post<ApiResponse<string>>(`${this.url}/register`, data)
      .pipe(
        tap((response) => {
          localStorage.setItem(this.token, response.data);
        })
      );
  }

  login(data: { email: string; password: string }): Observable<ApiResponse<string>> {
    return this._httpClient.post<ApiResponse<string>>(
      `${this.url}/login`,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    ).pipe(
      tap((response) => {
        if (response?.data) {
          localStorage.setItem(this.token, response.data);
        }
      })
    );
  }

  me(): Observable<ApiResponse<User>> {
    return this._httpClient.get<ApiResponse<User>>(
      `${this.url}/me`,
      { headers: { 'Authorization': `Bearer ${this.getAccessToken}` } }
    ).pipe(
      tap((response) => {
        if (response?.data) {
          localStorage.setItem("user", JSON.stringify(response.data));
        }
      })
    );
  }

  get getAccessToken(): string | null {
    return localStorage.getItem(this.token) || '';
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.token);
  }
}
