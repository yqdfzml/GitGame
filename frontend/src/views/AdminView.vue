<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { adminApi } from "../api/client";
import { TOPIC_CHAPTER_IDS } from "../utils/levelPresentation";

/** 管理端关卡列表项 */
interface AdminLevelItem {
  id: string;
  courseId: string;
  chapterId: string | null;
  title: string;
  description: string;
  difficulty: string;
  sortOrder: number;
  status: string;
}

/** 表单编辑数据 */
interface LevelFormData {
  courseId: string;
  chapterId: string;
  title: string;
  description: string;
  difficulty: string;
  sortOrder: number;
  initialState: Record<string, unknown>;
  goal: Record<string, unknown>;
  constraints: Record<string, unknown>;
}

/** 默认表单模板 */
const DEFAULT_FORM: LevelFormData = {
  courseId: "custom",
  chapterId: "workspace",
  title: "自定义关卡",
  description: "描述",
  difficulty: "BEGINNER",
  sortOrder: 99,
  initialState: {
    commits: {},
    branches: {},
    head: { type: "branch", ref: "main" },
    workingTree: {},
    index: {},
    conflicts: {},
    stash: [],
  },
  goal: { workingTreeClean: true },
  constraints: { baseScore: 100, stepPenalty: 2 },
};

/** 关卡列表 */
const levelList = ref<AdminLevelItem[]>([]);
/** 当前选中关卡 id，空字符串表示新建 */
const selectedLevelId = ref("");
/** 章节筛选 */
const chapterFilter = ref("");
/** 是否使用 JSON 高级模式 */
const advancedMode = ref(false);
/** 表单数据 */
const formData = ref<LevelFormData>({ ...DEFAULT_FORM });
/** JSON 高级模式文本 */
const jsonDraft = ref("");
/** 校验结果 */
const validationErrors = ref<string[]>([]);
/** 校验是否通过 */
const validationValid = ref(true);
/** 操作反馈 */
const message = ref("");
/** 是否错误反馈 */
const isError = ref(false);
/** 列表加载中 */
const listLoading = ref(true);
/** 详情加载中 */
const detailLoading = ref(false);
/** 保存中 */
const saving = ref(false);

/**
 * 加载关卡列表。
 * 功能：供左侧列表与章节筛选使用。
 * 参数：无。
 * 返回值：无。
 */
const loadLevelList = () => {
  listLoading.value = true;
  adminApi
    .listLevels(chapterFilter.value || undefined)
    .then((data) => {
      levelList.value = data;
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      listLoading.value = false;
    });
};

/**
 * 将表单同步到 JSON 文本。
 * 功能：高级模式与表单模式保持一致。
 * 参数：无。
 * 返回值：无。
 */
const syncJsonFromForm = () => {
  jsonDraft.value = JSON.stringify(formData.value, null, 2);
};

/**
 * 将 JSON 文本解析到表单。
 * 功能：高级模式编辑后回写表单字段。
 * 参数：无。
 * 返回值：是否解析成功。
 */
const syncFormFromJson = (): boolean => {
  const parsed = JSON.parse(jsonDraft.value) as Partial<LevelFormData>;
  formData.value = {
    courseId: parsed.courseId ?? DEFAULT_FORM.courseId,
    chapterId: parsed.chapterId ?? DEFAULT_FORM.chapterId,
    title: parsed.title ?? DEFAULT_FORM.title,
    description: parsed.description ?? DEFAULT_FORM.description,
    difficulty: parsed.difficulty ?? DEFAULT_FORM.difficulty,
    sortOrder: parsed.sortOrder ?? DEFAULT_FORM.sortOrder,
    initialState: parsed.initialState ?? DEFAULT_FORM.initialState,
    goal: parsed.goal ?? DEFAULT_FORM.goal,
    constraints: parsed.constraints ?? DEFAULT_FORM.constraints,
  };
  return true;
};

/**
 * 在本地执行 schema 预览校验。
 * 功能：右侧预览区即时展示基础字段问题。
 * 参数：无。
 * 返回值：无。
 */
const runLocalValidation = () => {
  const errors: string[] = [];

  if (!formData.value.title.trim()) {
    errors.push("标题不能为空");
  }
  if (!formData.value.description.trim()) {
    errors.push("描述不能为空");
  }
  if (!formData.value.courseId.trim()) {
    errors.push("courseId 不能为空");
  }
  if (typeof formData.value.initialState !== "object") {
    errors.push("initialState 必须是对象");
  }
  if (typeof formData.value.goal !== "object") {
    errors.push("goal 必须是对象");
  }
  if (typeof formData.value.constraints !== "object") {
    errors.push("constraints 必须是对象");
  }

  validationErrors.value = errors;
  validationValid.value = errors.length === 0;
};

/**
 * 选中关卡并加载详情。
 * 功能：中间表单与右侧预览跟随选中项更新。
 * 参数：levelId - 关卡 id。
 * 返回值：无。
 */
const selectLevel = (levelId: string) => {
  selectedLevelId.value = levelId;
  detailLoading.value = true;
  message.value = "";

  adminApi
    .getLevel(levelId)
    .then((detail) => {
      formData.value = {
        courseId: detail.courseId,
        chapterId: detail.chapterId ?? "",
        title: detail.title,
        description: detail.description,
        difficulty: detail.difficulty,
        sortOrder: detail.sortOrder,
        initialState: detail.initialState,
        goal: detail.goal,
        constraints: detail.constraints,
      };
      validationErrors.value = detail.validation.errors;
      validationValid.value = detail.validation.valid;
      syncJsonFromForm();
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      detailLoading.value = false;
    });
};

/**
 * 进入新建关卡模式。
 * 功能：清空选中项并恢复默认模板。
 * 参数：无。
 * 返回值：无。
 */
const startCreate = () => {
  selectedLevelId.value = "";
  formData.value = { ...DEFAULT_FORM };
  validationErrors.value = [];
  validationValid.value = true;
  syncJsonFromForm();
  message.value = "";
};

/**
 * 保存关卡。
 * 功能：新建或更新草稿，并在成功后刷新列表。
 * 参数：无。
 * 返回值：无。
 */
const saveLevel = () => {
  saving.value = true;
  message.value = "";
  isError.value = false;

  if (advancedMode.value) {
    syncFormFromJson();
  }

  runLocalValidation();
  if (!validationValid.value) {
    saving.value = false;
    message.value = "请先修正校验错误";
    isError.value = true;
    return;
  }

  const payload = { ...formData.value };

  const savePromise = selectedLevelId.value
    ? adminApi.updateLevel(selectedLevelId.value, payload)
    : adminApi.createLevel(payload);

  savePromise
    .then((result) => {
      message.value = selectedLevelId.value ? "关卡已更新" : "草稿关卡已创建";
      isError.value = false;
      if (!selectedLevelId.value) {
        selectedLevelId.value = result.id;
      }
      loadLevelList();
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      saving.value = false;
    });
};

/**
 * 发布当前关卡。
 * 功能：将草稿或已存在关卡发布到玩家端。
 * 参数：无。
 * 返回值：无。
 */
const publishLevel = () => {
  if (!selectedLevelId.value) {
    message.value = "请先保存关卡再发布";
    isError.value = true;
    return;
  }

  adminApi
    .publishLevel(selectedLevelId.value)
    .then(() => {
      message.value = "关卡已发布";
      isError.value = false;
      loadLevelList();
      selectLevel(selectedLevelId.value);
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    });
};

/** 当前选中关卡摘要 */
const selectedLevel = computed(() => {
  return levelList.value.find((level) => level.id === selectedLevelId.value) ?? null;
});

/** 预览 JSON 文本 */
const previewJson = computed(() => JSON.stringify(formData.value, null, 2));

watch(chapterFilter, loadLevelList);

watch(
  formData,
  () => {
    runLocalValidation();
    if (!advancedMode.value) {
      syncJsonFromForm();
    }
  },
  { deep: true },
);

watch(advancedMode, (enabled) => {
  if (enabled) {
    syncJsonFromForm();
  } else {
    syncFormFromJson();
    runLocalValidation();
  }
});

onMounted(() => {
  syncJsonFromForm();
  loadLevelList();
});
</script>

<template>
  <section class="page-stack admin-page">
    <header class="page-header">
      <h1 class="page-title">管理后台</h1>
    </header>

    <div class="admin-workspace">
      <aside class="admin-sidebar card">
        <div class="admin-sidebar-head">
          <h2>关卡列表</h2>
          <button class="btn-ghost admin-new-btn" @click="startCreate">新建</button>
        </div>

        <label class="admin-filter-label">
          章节筛选
          <select v-model="chapterFilter" class="admin-filter-select">
            <option value="">全部章节</option>
            <option v-for="chapterId in TOPIC_CHAPTER_IDS" :key="chapterId" :value="chapterId">
              {{ chapterId }}
            </option>
          </select>
        </label>

        <div v-if="listLoading" class="admin-list-loading">加载中...</div>
        <ul v-else class="admin-level-list">
          <li
            v-for="level in levelList"
            :key="level.id"
            class="admin-level-item"
            :class="{ active: selectedLevelId === level.id }"
            @click="selectLevel(level.id)"
          >
            <strong>{{ level.title }}</strong>
            <span class="admin-level-meta">
              {{ level.chapterId ?? "未分章" }} · {{ level.status }}
            </span>
          </li>
        </ul>
      </aside>

      <main class="admin-editor card">
        <div class="admin-editor-head">
          <h2>{{ selectedLevel ? "编辑关卡" : "新建关卡" }}</h2>
          <label class="admin-mode-toggle">
            <input v-model="advancedMode" type="checkbox" />
            JSON 高级模式
          </label>
        </div>

        <div v-if="detailLoading" class="loading-state">
          <div class="loading-spinner" />
          <span>加载关卡详情...</span>
        </div>

        <template v-else>
          <div v-if="advancedMode" class="form-group">
            <label>关卡 JSON</label>
            <textarea v-model="jsonDraft" rows="24" class="admin-json-textarea" />
          </div>

          <div v-else class="admin-form-grid">
            <div class="form-group">
              <label>标题</label>
              <input v-model="formData.title" type="text" />
            </div>
            <div class="form-group">
              <label>章节</label>
              <select v-model="formData.chapterId">
                <option v-for="chapterId in TOPIC_CHAPTER_IDS" :key="chapterId" :value="chapterId">
                  {{ chapterId }}
                </option>
              </select>
            </div>
            <div class="form-group admin-form-full">
              <label>描述</label>
              <textarea v-model="formData.description" rows="3" />
            </div>
            <div class="form-group">
              <label>难度</label>
              <select v-model="formData.difficulty">
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </select>
            </div>
            <div class="form-group">
              <label>排序</label>
              <input v-model.number="formData.sortOrder" type="number" />
            </div>
            <div class="form-group">
              <label>courseId</label>
              <input v-model="formData.courseId" type="text" />
            </div>
          </div>

          <div class="admin-editor-actions">
            <button class="btn-primary" :disabled="saving" @click="saveLevel">
              {{ saving ? "保存中..." : "保存草稿" }}
            </button>
            <button class="btn-ghost" :disabled="!selectedLevelId" @click="publishLevel">发布关卡</button>
          </div>

          <p v-if="message" :class="isError ? 'error-msg' : 'success-msg'">{{ message }}</p>
        </template>
      </main>

      <aside class="admin-preview card">
        <h2>预览与校验</h2>

        <div v-if="selectedLevel" class="admin-preview-status">
          <span>状态：{{ selectedLevel.status }}</span>
          <span>ID：{{ selectedLevel.id }}</span>
        </div>

        <div class="admin-validation" :class="validationValid ? 'ok' : 'fail'">
          <strong>{{ validationValid ? "校验通过" : "校验未通过" }}</strong>
          <ul v-if="validationErrors.length > 0">
            <li v-for="errorItem in validationErrors" :key="errorItem">{{ errorItem }}</li>
          </ul>
        </div>

        <div class="admin-preview-block">
          <h3>关卡摘要</h3>
          <p><strong>{{ formData.title }}</strong></p>
          <p class="admin-preview-desc">{{ formData.description }}</p>
          <p class="admin-preview-meta">
            {{ formData.chapterId }} · {{ formData.difficulty }} · sort {{ formData.sortOrder }}
          </p>
        </div>

        <div class="admin-preview-block">
          <h3>配置预览</h3>
          <pre class="admin-preview-json">{{ previewJson }}</pre>
        </div>
      </aside>
    </div>
  </section>
</template>
