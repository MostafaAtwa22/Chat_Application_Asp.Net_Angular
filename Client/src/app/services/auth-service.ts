import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../Models/ApiResponse';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private url = `${environment.baseUrl}/api/account`;

  constructor(private _httpClient: HttpClient) {}

  register(data: FormData): Observable<ApiResponse<string>> {
    return this._httpClient.post<ApiResponse<string>>(`${this.url}/register`, data)
      .pipe(
        tap((response) => {
          localStorage.setItem("token", response.data);
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
          localStorage.setItem("token", response.data);
        }
      })
    );
  }
}
