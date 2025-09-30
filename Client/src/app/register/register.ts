import { Component, signal } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../Models/ApiResponse';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class Register {
  profilePicture: string = 'https://randomuser.me/api/portraits/lego/5.jpg';
  profileImage: File | null = null;
  hide = signal(true);
  hideConfirm = signal(true);

  registerForm: FormGroup;

  constructor(
    private _authService: AuthService,
    private fb: FormBuilder,
    private _snakBar: MatSnackBar,
    private _router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        userName: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.pattern(/^[A-Za-z0-9_]+$/) // ✅ only letters, numbers, _
          ]
        ],
        fullName: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: this.passwordsMatchValidator } // ✅ custom validator
    );
  }

  // Custom validator to check password === confirmPassword
  passwordsMatchValidator: ValidatorFn = (form: AbstractControl): ValidationErrors | null => {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return password && confirm && password !== confirm
      ? { passwordMismatch: true }
      : null;
  };

  togglePassowrd(event: MouseEvent) {
    this.hide.set(!this.hide());
  }

  toggleConfirmPassword(event: MouseEvent) {
    this.hideConfirm.set(!this.hideConfirm());
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.profileImage = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profilePicture = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { email, userName, fullName, password, confirmPassword } = this.registerForm.value;

    const formData = new FormData();
    formData.append("Email", email);           
    formData.append("UserName", userName);
    formData.append("FullName", fullName);
    formData.append("Password", password);
    formData.append("ConfirmPassword", confirmPassword);

    if (this.profileImage) {
      formData.append("ProfileImage", this.profileImage);
    }

    this._authService.register(formData).subscribe({
      next: (response) => {
        this._snakBar.open("Registration successful!", 'Close');
        console.log("Registration successful:", response);
      },
      error: (err: HttpErrorResponse) => {
        let error = err.error as ApiResponse<string>;
        this._snakBar.open(error.error, 'Close')
        console.error("Registration failed:", err);
      },
      complete: () => {
        this._router.navigate(['/'])
      }
    });
  }
}
