namespace API.Services
{
    public static class FileUpload
    {
        public static async Task<string> Upload(IFormFile file)
        {
            var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");

            if (!Directory.Exists(uploadFolder))
                Directory.CreateDirectory(uploadFolder);

            // geterate ID unique (if 2 users add file with the same name)
            // and then combine them to the file extension (.pdf, .png, ...)
            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);

            // put it on the folder u spasify 
            var filePath = Path.Combine(uploadFolder, fileName);

            // create the file if not exists and delete if exists and add rewrite it
            await using var stream = new FileStream(filePath, FileMode.Create);
            // save it in the folder
            await file.CopyToAsync(stream);

            return fileName;
        }
    }
}