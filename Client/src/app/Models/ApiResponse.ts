export interface ApiResponse<T> {
  isSuccess: Boolean,
  data: T,
  error: string,
  message: string
}
