import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { ApiResponse } from '../Models/ApiResponse';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../services/auth-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    RouterLink
],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  profilePicture: string = 'https://randomuser.me/api/portraits/lego/5.jpg';
  profileImage: File | null = null;
  hide = signal(true);
  hideConfirm = signal(true);

  loginForm: FormGroup;

  constructor(
    private _authService: AuthService,
    private fb: FormBuilder,
    private _snakBar: MatSnackBar,
    private _router: Router
  ) {
    this.loginForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
      }
    );
  }

  togglePassowrd(event: MouseEvent) {
    this.hide.set(!this.hide());
  }

  toggleConfirmPassword(event: MouseEvent) {
    this.hideConfirm.set(!this.hideConfirm());
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;

    this._authService.login({ email, password }).subscribe({
      next: (response) => {
        this._authService.me().subscribe();
        this._snakBar.open("Login successful!", 'Close', {
          duration: 500,
        });
        console.log("Login successful:", response);

      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as ApiResponse<string>;
        this._snakBar.open(error?.error || "Login failed", 'Close');
        console.error("Login failed:", err);
      },
      complete:() => {
        this._router.navigate(['/chat']);
      }
    });
  }
}
