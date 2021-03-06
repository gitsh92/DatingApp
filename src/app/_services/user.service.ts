import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, throwError, Subscription } from 'rxjs';
import { User } from '../_models/User';
import { Message } from '../_models/Message';
import { JwtHelperService } from '@auth0/angular-jwt';
import { catchError, tap, map } from 'rxjs/operators';
import { PaginatedResult } from '../_models/Pagination';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private jwtHelper: JwtHelperService) {}

  getUsers(
    page?: number,
    itemsPerPage?: number,
    userParams?: any,
    likesParam?: string
  ): Observable<PaginatedResult<User[]>> {
    const paginatedResult = new PaginatedResult<User[]>();
    let queryString = '?';

    if (page != null && itemsPerPage != null) {
      queryString += `pageNumber=${page}&pageSize=${itemsPerPage}&`;
    }

    if (likesParam === 'Likers') {
      queryString += 'Likers=true&';
    }
    if (likesParam === 'Likees') {
      queryString += 'Likees=true&';
    }

    if (userParams != null) {
      const { minAge, maxAge, gender, orderBy } = userParams;
      queryString += `minAge=${minAge}&maxAge=${maxAge}&gender=${gender}&orderBy=${orderBy}&`;
    }

    return this.http
      .get<User[]>(this.baseUrl + 'users' + queryString, {
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<User[]>) => {
          paginatedResult.result = response.body;

          if (response.headers.get('Pagination') != null) {
            paginatedResult.pagination = JSON.parse(
              response.headers.get('Pagination')
            );
          }

          return paginatedResult;
        }),
        catchError(this.handleError)
      );
  }

  getUser(id: number): Observable<User> {
    return this.http
      .get<User>(this.baseUrl + `users/${id}`)
      .pipe(catchError(this.handleError));
  }

  updateUser(id: number, user: User): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http
      .put(this.baseUrl + `users/${id}`, user, { headers })
      .pipe(catchError((err) => this.handleError));
  }

  setMainPhoto(userId: number, photoId: number): Observable<any> {
    return this.http
      .post(this.baseUrl + `users/${userId}/photos/${photoId}/setMain`, {})
      .pipe(catchError(this.handleError));
  }

  deletePhoto(userId: number, photoId: number): Observable<any> {
    return this.http
      .delete(this.baseUrl + `users/${userId}/photos/${photoId}`)
      .pipe(catchError(this.handleError));
  }

  sendLike(id: number, recipientId: number): Observable<any> {
    return this.http
      .post(this.baseUrl + `users/${id}/like/${recipientId}`, {})
      .pipe(catchError(this.handleError));
  }

  getMessages(
    id: number,
    page?: number,
    itemsPerPage?: number,
    messageContainer?: string
  ): Observable<PaginatedResult<Message[]>> {
    const paginatedResult = new PaginatedResult<Message[]>();
    let queryString = `?MessageContainer=${messageContainer}&`;

    if (page != null && itemsPerPage != null) {
      queryString += `pageNumber=${page}&pageSize=${itemsPerPage}&`;
    }

    return this.http
      .get(this.baseUrl + `users/${id}/messages${queryString}`, {
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<Message[]>) => {
          paginatedResult.result = response.body;

          if (response.headers.get('Pagination') != null) {
            paginatedResult.pagination = JSON.parse(
              response.headers.get('Pagination')
            );
          }

          return paginatedResult;
        }),
        catchError(this.handleError)
      );
  }

  getMessageThread(id: number, recipientId: number): Observable<Message[]> {
    return this.http
      .get<Message[]>(
        this.baseUrl + `users/${id}/messages/thread/${recipientId}`,
        {
          observe: 'response',
        }
      )
      .pipe(
        map((res) => res.body),
        catchError(this.handleError)
      );
  }

  sendMessage(id: number, message: Message): Observable<any> {
    return this.http
      .post(this.baseUrl + `users/${id}/messages`, message)
      .pipe(catchError(this.handleError));
  }

  deleteMessage(id: number, userId: number): Observable<any> {
    return this.http
      .post(this.baseUrl + `users/${userId}/messages/${id}`, {})
      .pipe(catchError(this.handleError));
  }

  markAsRead(id: number, userId: number): Subscription {
    return this.http
      .post(this.baseUrl + `users/${userId}/messages/${id}/read`, {})
      .subscribe(() => {});
  }

  private handleError(error: any) {
    const applicationError = error?.headers?.get('Application-Error');
    if (applicationError) {
      return throwError(applicationError);
    }
    if (error.status === 401) {
      return throwError('Your token has expired.');
    }
    let modelStateErrors = [];
    if (error?.error?.errors) {
      Object.values(error.error.errors).forEach((e: string[]) =>
        modelStateErrors.push(...e)
      );
    }
    let badRequestErrors = [];
    if (error.status === 400) {
      badRequestErrors.push(error.error);
    }
    return throwError(
      [...badRequestErrors, ...modelStateErrors].join('\n') || 'Server error'
    );
  }
}
