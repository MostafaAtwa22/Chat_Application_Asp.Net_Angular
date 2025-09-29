import { Component } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class Register {
  constructor(private _authService: AuthService) {}

  // ✅ Form Controls
  fullNameControl = new FormControl('', [Validators.required]);
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  passwordControl = new FormControl('', [Validators.required, Validators.minLength(6)]);
  confirmPasswordControl = new FormControl('', [Validators.required]);

  profileImage: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  get passwordMismatch(): boolean {
    const pass = this.passwordControl.value ?? '';
    const confirm = this.confirmPasswordControl.value ?? '';
    return confirm !== '' && pass !== confirm;
  }

  get formValid(): boolean {
    return (
      this.fullNameControl.valid &&
      this.emailFormControl.valid &&
      this.passwordControl.valid &&
      this.confirmPasswordControl.valid &&
      !this.passwordMismatch
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.profileImage = input.files[0];

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
        console.log('Image preview loaded:', this.imagePreview);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
      reader.readAsDataURL(this.profileImage);
    } else {
      this.imagePreview = null;
    }
  }

  onSubmit(): void {
    if (!this.formValid) return;

    const formData = new FormData();
    formData.append('fullName', this.fullNameControl.value!);
    formData.append('email', this.emailFormControl.value!);
    formData.append('password', this.passwordControl.value!);
    if (this.profileImage) {
      formData.append('profileImage', this.profileImage);
    }

    this._authService.register(formData).subscribe({
      next: (res) => console.log('✅ Registered:', res),
      error: (err) => console.error('❌ Error:', err)
    });
  }
}
