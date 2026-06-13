import type { LevelConfig, LevelConstraints, LevelGoal, RepoState } from "../git-engine/repo-state.types";

/**
 * 校验关卡 JSON 配置是否合法。
 * 功能：发布前 schema 校验，防止脏数据入库。
 * 参数：config - 含 initialState/goal/constraints 的对象。
 * 返回值：校验结果，valid=false 时含 errors 列表。
 */
export const validateLevelConfig = (
  config: unknown,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config || typeof config !== "object") {
    return { valid: false, errors: ["配置必须是对象"] };
  }

  const data = config as Partial<LevelConfig>;

  if (!isValidRepoState(data.initialState)) {
    errors.push("initialState 格式不合法");
  }
  if (!isValidGoal(data.goal)) {
    errors.push("goal 格式不合法");
  }
  if (data.constraints !== undefined && !isValidConstraints(data.constraints)) {
    errors.push("constraints 格式不合法");
  }

  return { valid: errors.length === 0, errors };
};

/** 校验 RepoState 基本结构 */
const isValidRepoState = (state: unknown): state is RepoState => {
  if (!state || typeof state !== "object") {
    return false;
  }
  const s = state as RepoState;
  return (
    typeof s.commits === "object" &&
    typeof s.branches === "object" &&
    s.head !== undefined &&
    typeof s.workingTree === "object" &&
    typeof s.index === "object" &&
    typeof s.conflicts === "object"
  );
};

/** 校验 LevelGoal 基本结构 */
const isValidGoal = (goal: unknown): goal is LevelGoal => {
  if (!goal || typeof goal !== "object") {
    return false;
  }
  return true;
};

/** 校验 LevelConstraints 基本结构 */
const isValidConstraints = (constraints: unknown): constraints is LevelConstraints => {
  if (!constraints || typeof constraints !== "object") {
    return false;
  }
  return true;
};
