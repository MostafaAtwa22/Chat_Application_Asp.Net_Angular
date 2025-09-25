using System;

namespace API.Response;

public class Response<T>
{
    public bool IsSuccess { get; set; }
    public T Data { get; set; }
    public string? Error { get; set; }
    public string? Message { get; set; }

    public Response(bool isSuccess, T data, string? error, string? message)
    {
        IsSuccess = isSuccess;
        Data = data;
        Error = error;
        Message = message;
    }

    public static Response<T> Success(T data, string? message = "")
        => new(true, data, null, message);

    public static Response<T> Failure(string error)
        => new(true, default!, error, null);
}
