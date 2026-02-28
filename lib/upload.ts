import fs from 'node:fs/promises';
import path from 'node:path';
import logger from "@/lib/logger";

/**
 * Saves a file to the local filesystem.
 * 
 * @param file - The file object (usually from FormData)
 * @param folder - The subfolder within public/uploads to save to (e.g., 'students', 'documents')
 * @returns The public URL path to the saved file
 */
export async function saveFile(file: File, folder: string): Promise<string> {
  // Convert File to Buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Sanitize filename and add timestamp for uniqueness
  const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  const filename = `${Date.now()}-${safeName}`;
  
  // Define the upload directory path (public/uploads/{folder})
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  
  // Ensure the directory exists
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }

  // Save the file
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);

  // Return the web-accessible URL path
  // Note: Next.js serves files in 'public' at the root path
  return `/uploads/${folder}/${filename}`;
}

/**
 * Deletes a file from the local filesystem.
 * 
 * @param fileUrl - The public URL path of the file to delete
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;

  try {
    // Convert URL path back to filesystem path
    // Remove the leading slash and join with cwd/public
    const relativePath = fileUrl.substring(1); // "uploads/folder/file.jpg"
    const filePath = path.join(process.cwd(), 'public', relativePath);
    
    await fs.unlink(filePath);
  } catch (error) {
    // Log error but don't throw, as file might already be gone
    logger.error({ err: error }, `Failed to delete file: ${fileUrl}`);
  }
}
