/** 工作区文件状态到中文标签的映射 */
const FILE_STATUS_LABELS: Record<string, string> = {
  unchanged: "未变更",
  modified: "已修改",
  added: "新文件",
  untracked: "未跟踪",
  deleted: "已删除",
};

/**
 * 将工作区文件状态转为中文展示标签。
 * 功能：Working Tree 面板中把后端 status 字段显示为中文。
 * 参数：status - 后端返回的文件状态字符串。
 * 返回值：中文标签，未知状态原样返回。
 */
export const fileStatusLabel = (status: string): string => {
  return FILE_STATUS_LABELS[status] ?? status;
};
