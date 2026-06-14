/**
 * 章节 id 迁移与等效映射。
 * 功能：关卡重排后，旧章节通关记录仍可用于徽章判定。
 */

/** 旧章节 id -> 新章节 id（一对一迁移） */
export const LEGACY_CHAPTER_MIGRATION: Record<string, string> = {
  stash: "undo",
  "cherry-pick": "advanced",
  debug: "advanced",
};

/**
 * 将数据库中的章节 id 规范化为当前路线使用的 id。
 * 功能：读取用户历史通关时，把旧 stash/cherry-pick/debug 映射到新章节。
 * 参数：chapterId - 原始章节 id。
 * 返回值：规范化后的章节 id，空值原样返回。
 */
export const normalizeChapterId = (chapterId: string | null): string | null => {
  if (!chapterId) {
    return null;
  }
  return LEGACY_CHAPTER_MIGRATION[chapterId] ?? chapterId;
};

/**
 * 判断用户是否已通关指定章节（含旧 id 等效）。
 * 功能：徽章判定时使用，避免因章节拆分导致旧进度失效。
 * 参数：clearedChapterIds - 用户已通关章节列表；targetChapterId - 目标章节 id。
 * 返回值：是否视为已通关该章节。
 */
export const hasClearedChapter = (
  clearedChapterIds: string[],
  targetChapterId: string,
): boolean => {
  /** 目标章节及其旧 id 别名，任意命中即算通关 */
  const acceptedIds = new Set<string>([targetChapterId]);
  for (const [legacyId, modernId] of Object.entries(LEGACY_CHAPTER_MIGRATION)) {
    if (modernId === targetChapterId) {
      acceptedIds.add(legacyId);
    }
  }
  return clearedChapterIds.some((id) => acceptedIds.has(id));
};
