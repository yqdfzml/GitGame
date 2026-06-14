import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";

/** 允许上传的头像 MIME 类型 */
const ALLOWED_AVATAR_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * 头像文件存储服务。
 * 功能：校验并保存注册时上传的头像到本地目录。
 */
@Injectable()
export class AvatarStorageService {
  /** 头像保存目录绝对路径 */
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>("AVATAR_UPLOAD_DIR") ?? join(process.cwd(), "uploads", "avatars");
  }

  /**
   * 保存头像文件。
   * 功能：校验类型与大小后写入磁盘，返回对外访问路径。
   * 参数：file - multer 上传文件对象。
   * 返回值：形如 /uploads/avatars/xxx.jpg 的 URL 路径。
   */
  async saveAvatar(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException("请上传头像");
    }

    if (!ALLOWED_AVATAR_MIMES.has(file.mimetype)) {
      throw new BadRequestException("头像仅支持 JPEG、PNG、WebP");
    }

    const maxSize = Number(this.config.get<string>("AVATAR_MAX_SIZE") ?? 2 * 1024 * 1024);
    if (file.size > maxSize) {
      throw new BadRequestException("头像文件过大");
    }

    const ext = extname(file.originalname).toLowerCase();
    const safeExt = ext === ".png" || ext === ".webp" ? ext : ".jpg";
    const filename = `${randomUUID()}${safeExt}`;

    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(join(this.uploadDir, filename), file.buffer);

    return `/uploads/avatars/${filename}`;
  }
}
