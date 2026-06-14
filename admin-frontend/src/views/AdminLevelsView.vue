<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { adminApi } from "../api/client";
import AdminListState from "../components/admin/AdminListState.vue";
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";
import type {
  AdminLevelFormData,
  AdminLevelItem,
  AdminLevelListFilters,
} from "../types/admin";
import { TOPIC_CHAPTER_IDS, difficultyLabel, getChapterLabel } from "@shared/utils/levelPresentation";

/** 默认表单模板 */
const DEFAULT_FORM: AdminLevelFormData = {
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
/** 列表筛选条件 */
const filters = ref<AdminLevelListFilters>({
  search: "",
  chapterId: "",
  status: "",
  difficulty: "",
});
/** 是否使用 JSON 高级模式 */
const advancedMode = ref(false);
/** 表单数据 */
const formData = ref<AdminLevelFormData>({ ...DEFAULT_FORM });
/** JSON 高级模式文本 */
const jsonDraft = ref("");
/** JSON 解析错误 */
const jsonParseError = ref("");
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
/** 列表错误 */
const listError = ref("");
/** 详情加载中 */
const detailLoading = ref(false);
/** 保存中 */
const saving = ref(false);
/** 发布中 */
const publishing = ref(false);
/** 归档中 */
const archiving = ref(false);
/** 复制中 */
const cloning = ref(false);

/**
 * 加载关卡列表。
 * 功能：按筛选条件请求后台列表。
 * 参数：无。
 * 返回值：无。
 */
const loadLevelList = () => {
  listLoading.value = true;
  listError.value = "";

  adminApi
    .listLevels({
      search: filters.value.search || undefined,
      chapterId: filters.value.chapterId || undefined,
      status: filters.value.status || undefined,
      difficulty: filters.value.difficulty || undefined,
    })
    .then((data) => {
      levelList.value = data;
    })
    .catch((err: Error) => {
      listError.value = err.message;
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
  jsonParseError.value = "";
};

/**
 * 将 JSON 文本解析到表单。
 * 功能：高级模式编辑后回写表单字段。
 * 参数：无。
 * 返回值：是否解析成功。
 */
const syncFormFromJson = (): boolean => {
  try {
    const parsed = JSON.parse(jsonDraft.value) as Partial<AdminLevelFormData>;
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
    jsonParseError.value = "";
    return true;
  } catch (error) {
    jsonParseError.value = error instanceof Error ? error.message : "JSON 解析失败";
    return false;
  }
};

/**
 * 格式化 JSON 文本。
 * 功能：重新缩进 JSON 草稿，便于阅读和排查。
 * 参数：无。
 * 返回值：无。
 */
const formatJsonDraft = () => {
  if (!syncFormFromJson()) {
    return;
  }
  syncJsonFromForm();
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

  if (advancedMode.value && !syncFormFromJson()) {
    saving.value = false;
    message.value = jsonParseError.value || "JSON 格式错误";
    isError.value = true;
    return;
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
 * 功能：先本地校验，再调用后台发布接口。
 * 参数：无。
 * 返回值：无。
 */
const publishLevel = () => {
  if (!selectedLevelId.value) {
    message.value = "请先保存关卡再发布";
    isError.value = true;
    return;
  }

  if (advancedMode.value && !syncFormFromJson()) {
    message.value = jsonParseError.value || "JSON 格式错误，无法发布";
    isError.value = true;
    return;
  }

  runLocalValidation();
  if (!validationValid.value) {
    message.value = "发布前校验未通过，请先修正错误";
    isError.value = true;
    return;
  }

  publishing.value = true;
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
    })
    .finally(() => {
      publishing.value = false;
    });
};

/**
 * 归档当前关卡。
 * 功能：将已发布关卡标记为 ARCHIVED。
 * 参数：无。
 * 返回值：无。
 */
const archiveLevel = () => {
  if (!selectedLevelId.value) {
    return;
  }

  const confirmed = window.confirm("确认归档该关卡？归档后玩家端将不再展示。");
  if (!confirmed) {
    return;
  }

  archiving.value = true;
  adminApi
    .archiveLevel(selectedLevelId.value)
    .then(() => {
      message.value = "关卡已归档";
      isError.value = false;
      loadLevelList();
      selectLevel(selectedLevelId.value);
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      archiving.value = false;
    });
};

/**
 * 复制当前关卡。
 * 功能：基于现有配置创建 DRAFT 副本。
 * 参数：无。
 * 返回值：无。
 */
const cloneLevel = () => {
  if (!selectedLevelId.value) {
    return;
  }

  cloning.value = true;
  adminApi
    .cloneLevel(selectedLevelId.value)
    .then((result) => {
      message.value = `已复制为「${result.title}」`;
      isError.value = false;
      loadLevelList();
      selectLevel(result.id);
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      cloning.value = false;
    });
};

/**
 * 应用排序字段。
 * 功能：单独更新 courseId、chapterId、sortOrder。
 * 参数：无。
 * 返回值：无。
 */
const applySortFields = () => {
  if (!selectedLevelId.value) {
    return;
  }

  adminApi
    .updateLevelSort(selectedLevelId.value, {
      courseId: formData.value.courseId,
      chapterId: formData.value.chapterId,
      sortOrder: formData.value.sortOrder,
    })
    .then(() => {
      message.value = "排序字段已更新";
      isError.value = false;
      loadLevelList();
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

/** 列表是否为空 */
const listEmpty = computed(() => levelList.value.length === 0);

/** 状态中文映射 */
const statusLabelMap: Record<string, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  ARCHIVED: "已归档",
};

watch(
  filters,
  () => {
    loadLevelList();
  },
  { deep: true },
);

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

watch(jsonDraft, () => {
  if (!advancedMode.value) {
    return;
  }
  syncFormFromJson();
});

onMounted(() => {
  syncJsonFromForm();
  loadLevelList();
});
</script>

<template>
  <section class="admin-levels-page">
    <AdminPageHeader title="关卡管理" description="内容生产工具：列表筛选、编辑、校验与发布。">
      <template #actions>
        <button class="btn-primary" @click="startCreate">新建关卡</button>
      </template>
    </AdminPageHeader>

    <div class="admin-workspace">
      <aside class="admin-sidebar card">
        <div class="admin-sidebar-head">
          <h2>关卡列表</h2>
        </div>

        <div class="admin-filter-grid">
          <label class="admin-filter-label">
            搜索标题
            <input v-model="filters.search" type="search" placeholder="输入标题关键词" />
          </label>
          <label class="admin-filter-label">
            章节
            <select v-model="filters.chapterId" class="admin-filter-select">
              <option value="">全部章节</option>
              <option v-for="chapterId in TOPIC_CHAPTER_IDS" :key="chapterId" :value="chapterId">
                {{ getChapterLabel(chapterId) }}
              </option>
            </select>
          </label>
          <label class="admin-filter-label">
            状态
            <select v-model="filters.status" class="admin-filter-select">
              <option value="">全部状态</option>
              <option value="DRAFT">草稿</option>
              <option value="PUBLISHED">已发布</option>
              <option value="ARCHIVED">已归档</option>
            </select>
          </label>
          <label class="admin-filter-label">
            难度
            <select v-model="filters.difficulty" class="admin-filter-select">
              <option value="">全部难度</option>
              <option value="BEGINNER">{{ difficultyLabel("BEGINNER") }}</option>
              <option value="INTERMEDIATE">{{ difficultyLabel("INTERMEDIATE") }}</option>
              <option value="ADVANCED">{{ difficultyLabel("ADVANCED") }}</option>
            </select>
          </label>
        </div>

        <AdminListState
          :loading="listLoading"
          :error="listError"
          :empty="listEmpty"
          empty-text="没有匹配的关卡"
        >
          <ul class="admin-level-list">
            <li
              v-for="level in levelList"
              :key="level.id"
              class="admin-level-item"
              :class="{ active: selectedLevelId === level.id }"
              @click="selectLevel(level.id)"
            >
              <strong>{{ level.title }}</strong>
              <span class="admin-level-meta">
                {{ getChapterLabel(level.chapterId) }} · {{ statusLabelMap[level.status] ?? level.status }}
              </span>
            </li>
          </ul>
        </AdminListState>
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
            <div class="admin-json-toolbar">
              <label>关卡 JSON</label>
              <button class="btn-ghost admin-json-format-btn" type="button" @click="formatJsonDraft">
                格式化 JSON
              </button>
            </div>
            <textarea v-model="jsonDraft" rows="24" class="admin-json-textarea" />
            <p v-if="jsonParseError" class="error-msg">{{ jsonParseError }}</p>
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
                  {{ getChapterLabel(chapterId) }}
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
                <option value="BEGINNER">{{ difficultyLabel("BEGINNER") }}</option>
                <option value="INTERMEDIATE">{{ difficultyLabel("INTERMEDIATE") }}</option>
                <option value="ADVANCED">{{ difficultyLabel("ADVANCED") }}</option>
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
            <button
              class="btn-ghost"
              :disabled="!selectedLevelId || publishing"
              title="发布前会执行本地校验"
              @click="publishLevel"
            >
              {{ publishing ? "发布中..." : "发布关卡" }}
            </button>
            <button
              class="btn-ghost"
              :disabled="!selectedLevelId || cloning"
              title="复制为草稿副本"
              @click="cloneLevel"
            >
              {{ cloning ? "复制中..." : "复制关卡" }}
            </button>
            <button
              class="btn-ghost"
              :disabled="!selectedLevelId || archiving"
              title="归档后玩家端不可见"
              @click="archiveLevel"
            >
              {{ archiving ? "归档中..." : "归档关卡" }}
            </button>
            <button
              class="btn-ghost"
              :disabled="!selectedLevelId"
              title="单独更新 courseId / chapterId / sortOrder"
              @click="applySortFields"
            >
              应用排序
            </button>
          </div>

          <p v-if="message" :class="isError ? 'error-msg' : 'success-msg'">{{ message }}</p>
        </template>
      </main>

      <aside class="admin-preview card">
        <h2>预览与校验</h2>

        <div v-if="selectedLevel" class="admin-preview-status">
          <span>状态：{{ statusLabelMap[selectedLevel.status] ?? selectedLevel.status }}</span>
          <span>ID：{{ selectedLevel.id }}</span>
        </div>

        <div class="admin-validation" :class="validationValid ? 'ok' : 'fail'">
          <strong>{{ validationValid ? "校验通过" : "校验未通过" }}</strong>
          <p class="admin-validation-hint">发布前请确认以下检查项全部通过</p>
          <ul v-if="validationErrors.length > 0">
            <li v-for="errorItem in validationErrors" :key="errorItem">{{ errorItem }}</li>
          </ul>
        </div>

        <div class="admin-preview-block">
          <h3>关卡摘要</h3>
          <p><strong>{{ formData.title }}</strong></p>
          <p class="admin-preview-desc">{{ formData.description }}</p>
          <p class="admin-preview-meta">
            {{ getChapterLabel(formData.chapterId) }} · {{ difficultyLabel(formData.difficulty) }} · sort {{ formData.sortOrder }}
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
