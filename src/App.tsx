import {
  BookOpenCheck,
  ChevronRight,
  CircleDot,
  GitBranch,
  GitCommitHorizontal,
  History,
  Home,
  RotateCcw,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { CHALLENGES } from "./game/challenges";
import { isApiEnabled, loginAccount, registerAccount, updateCurrentTitle } from "./game/apiClient";
import {
  clearAuthSession,
  loadAuthSession,
  loadAuthUser,
  saveAuthSession,
} from "./game/authStorage";
import { mergeProfilesPreferHigher, pullCloudProfile } from "./game/profileSync";
import {
  createInitialProfile,
  getLevelInfo,
  getLevelProgress,
} from "./game/growth";
import { clearProfile, loadProfile, saveProfile } from "./game/storage";
import { getTitleById, TITLE_RULES } from "./game/titles";
import { PlayPageRoute } from "./pages/PlayPageRoute";
import type { AuthUser, Challenge, PlayerProfile } from "./game/types";

const kindIcon = {
  commit: GitCommitHorizontal,
  staging: CircleDot,
  branch: GitBranch,
  merge: BookOpenCheck,
  history: History,
  conflict: Zap,
};

const navItems = [
  { path: "/", label: "修炼台", icon: Home, end: true },
  { path: "/levels", label: "关卡", icon: BookOpenCheck },
  { path: "/profile", label: "个人中心", icon: User },
];

/** Git 技能方向的中文标签，用于个人页能力掌握展示 */
const SKILL_KIND_LABELS: Record<Challenge["kind"], string> = {
  commit: "提交基础",
  staging: "暂存区理解",
  branch: "分支操作",
  merge: "合并流程",
  history: "历史回溯",
  conflict: "冲突处理",
};

const getLocked = (challenge: Challenge, profile: PlayerProfile) => {
  const index = CHALLENGES.findIndex((item) => item.id === challenge.id);
  return index > 0 && !profile.completedChallengeIds.includes(CHALLENGES[index - 1].id);
};

function App() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => loadAuthUser());
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const groupedChallenges = useMemo(() => {
    return CHALLENGES.reduce<Record<string, Challenge[]>>((groups, challenge) => {
      groups[challenge.chapter] = [...(groups[challenge.chapter] ?? []), challenge];
      return groups;
    }, {});
  }, []);
  const recommendedChallenge =
    CHALLENGES.find((challenge) => !profile.completedChallengeIds.includes(challenge.id)) ?? CHALLENGES.at(-1) ?? CHALLENGES[0];

  useEffect(() => saveProfile(profile), [profile]);

  const chooseTitle = (titleId: string) => {
    if (!profile.unlockedTitleIds.includes(titleId)) return;

    setProfile((current) => ({ ...current, activeTitleId: titleId }));

    const session = loadAuthSession();
    if (session && isApiEnabled()) {
      updateCurrentTitle(session.accessToken, titleId).catch(() => {
        setAuthMessage("称号已本地更新，但云端同步失败。");
      });
    }
  };

  /**
   * 登录或注册成功后恢复云端档案。
   * 功能：写入 token，拉取 profile/progress/titles 并与本地合并。
   * 参数：session - 后端返回的登录会话。
   * 返回值：Promise。
   */
  const handleAuthSuccess = (session: { accessToken: string; user: AuthUser }) => {
    saveAuthSession(session);
    setAuthUser(session.user);
    setAuthMessage("登录成功，正在恢复云端进度…");

    if (!isApiEnabled()) {
      setAuthMessage("登录成功。当前未启用 API 同步，进度仍保存在本地。");
      return Promise.resolve();
    }

    return pullCloudProfile({ accessToken: session.accessToken })
      .then((cloudProfile) => {
        setProfile((current) => mergeProfilesPreferHigher(current, cloudProfile));
        setAuthMessage("云端进度已恢复。");
      })
      .catch(() => {
        setAuthMessage("登录成功，但暂时无法拉取云端进度。");
      });
  };

  /**
   * 提交登录或注册表单。
   * 功能：调用后端认证接口。
   * 参数：无。
   * 返回值：Promise。
   */
  const submitAuthForm = () => {
    if (authBusy) return Promise.resolve();
    setAuthBusy(true);
    setAuthMessage("");

    const task =
      authMode === "register"
        ? registerAccount(authEmail, authPassword, authDisplayName)
        : loginAccount(authEmail, authPassword);

    return task
      .then((session) => handleAuthSuccess(session))
      .catch((error: Error) => {
        setAuthMessage(error.message || "认证失败，请稍后重试。");
      })
      .finally(() => {
        setAuthBusy(false);
      });
  };

  /**
   * 退出登录并清除本地 token。
   * 功能：保留本地游戏进度，只移除云同步身份。
   * 参数：无。
   * 返回值：无。
   */
  const logoutAccount = () => {
    clearAuthSession();
    setAuthUser(null);
    setAuthMessage("已退出登录，本地进度仍保留在当前设备。");
  };

  const resetProfile = () => {
    clearProfile();
    setProfile(createInitialProfile());
    navigate("/");
  };

  return (
    <main className="app-shell">
      <AppHeader profile={profile} />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              profile={profile}
              recommendedChallenge={recommendedChallenge}
              onStart={() => navigate(`/play/${recommendedChallenge.id}`)}
              onViewLevels={() => navigate("/levels")}
            />
          }
        />
        <Route
          path="/levels"
          element={
            <LevelsPage
              groupedChallenges={groupedChallenges}
              profile={profile}
              onStart={(challengeId) => navigate(`/play/${challengeId}`)}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProfilePage
              authBusy={authBusy}
              authDisplayName={authDisplayName}
              authEmail={authEmail}
              authMessage={authMessage}
              authMode={authMode}
              authPassword={authPassword}
              authUser={authUser}
              onAuthDisplayNameChange={setAuthDisplayName}
              onAuthEmailChange={setAuthEmail}
              onAuthModeChange={setAuthMode}
              onAuthPasswordChange={setAuthPassword}
              onChooseTitle={chooseTitle}
              onLogout={logoutAccount}
              onReset={resetProfile}
              onSubmitAuth={submitAuthForm}
              profile={profile}
            />
          }
        />
        <Route path="/play/:challengeId" element={<PlayPageRoute profile={profile} setProfile={setProfile} />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </main>
  );
}

/**
 * 顶部导航栏，展示品牌、页面切换与玩家状态摘要。
 * 功能：品牌入口、主导航、个人中心快捷入口。
 * 参数：profile - 当前玩家档案，用于顶栏等级与经验展示。
 * 返回值：顶部导航 JSX。
 */
function AppHeader({ profile }: { profile: PlayerProfile }) {
  const levelInfo = getLevelInfo(profile.level);
  const levelProgress = getLevelProgress(profile.xp);
  const activeTitle = getTitleById(profile.activeTitleId);

  return (
    <header className="topbar">
      <NavLink className="brand-button" to="/">
        <GitBranch aria-hidden="true" />
        <span>GitGame</span>
      </NavLink>
      <nav aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              className={({ isActive }) => (isActive ? "active" : "")}
              end={item.end}
              key={item.path}
              to={item.path}
            >
              <Icon aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <NavLink className="player-chip" to="/profile" aria-label="打开个人中心">
        <span className="player-chip-level">Lv.{levelInfo.level}</span>
        <div className="player-chip-meta">
          <strong>{activeTitle.name}</strong>
          <small>{profile.xp} 经验值 · {levelProgress.percent}%</small>
        </div>
        <div className="player-chip-bar" aria-hidden="true">
          <div style={{ width: `${levelProgress.percent}%` }} />
        </div>
      </NavLink>
    </header>
  );
}

function HomePage({
  onStart,
  onViewLevels,
  profile,
  recommendedChallenge,
}: {
  onStart: () => void;
  onViewLevels: () => void;
  profile: PlayerProfile;
  recommendedChallenge: Challenge;
}) {
  const levelInfo = getLevelInfo(profile.level);
  const activeTitle = getTitleById(profile.activeTitleId);
  const levelProgress = getLevelProgress(profile.xp);
  const completedCount = profile.completedChallengeIds.length;
  const totalCount = CHALLENGES.length;
  const routePercent = Math.round((completedCount / totalCount) * 100);
  const isNewPlayer = completedCount === 0;
  const RecommendedIcon = kindIcon[recommendedChallenge.kind];
  // 首页技能路径节点：按技能方向统计通关数
  const skillPathNodes = (Object.keys(SKILL_KIND_LABELS) as Challenge["kind"][]).map((kind) => {
    const total = CHALLENGES.filter((item) => item.kind === kind).length;
    const done = CHALLENGES.filter(
      (item) => item.kind === kind && profile.completedChallengeIds.includes(item.id),
    ).length;
    const nodeState = done >= total && total > 0 ? "done" : done > 0 ? "partial" : "idle";
    return { kind, label: SKILL_KIND_LABELS[kind], done, total, nodeState };
  });

  return (
    <section className="home-layout">
      <article className="surface hero-card">
        <p className="eyebrow">Git 修仙录</p>
        <h1 className="hero-title">GitGame</h1>
        <p className="hero-subtitle">从凡人开发者到版本控制宗师</p>
        <p className="hero-copy">命令行里练 Git，逐关掌握 commit、分支与合并。</p>

        <div className="home-skill-path" aria-label="六大 Git 技能路径">
          {skillPathNodes.map((node) => {
            const SkillIcon = kindIcon[node.kind];
            return (
              <div className={`home-skill-node ${node.nodeState}`} key={node.kind} title={node.label}>
                <span className="home-skill-node-icon" aria-hidden="true"><SkillIcon /></span>
                <span className="home-skill-node-label">{node.label}</span>
                <span className="home-skill-node-count">{node.done}/{node.total}</span>
              </div>
            );
          })}
        </div>

        <div className="hero-status">
          <div className="hero-status-main">
            <span className="hero-status-level">Lv.{levelInfo.level}</span>
            <div className="hero-status-meta">
              <strong>{levelInfo.name}</strong>
              <span>{activeTitle.name}</span>
            </div>
          </div>
          <div className="hero-status-progress">
            <div className="hero-route-head">
              <span>修炼路径 {completedCount}/{totalCount} 关</span>
              <strong>{routePercent}%</strong>
            </div>
            <div className="progress-track hero-route-track" aria-label="总关卡进度">
              <div style={{ width: `${routePercent}%` }} />
            </div>
            <div className="hero-status-xp">
              <span>经验值 {profile.xp}</span>
              <span>{levelProgress.percent}%</span>
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <button className="primary cta" type="button" onClick={onStart}>
            {isNewPlayer ? "开始修炼" : "继续修炼"}
          </button>
          <button className="secondary cta" type="button" onClick={onViewLevels}>查看关卡</button>
        </div>
      </article>

      <article className="surface mission-spotlight">
        <div className="mission-spotlight-head">
          <p className="eyebrow">{isNewPlayer ? "入门指引" : "推荐下一关"}</p>
          <span className="mission-spotlight-badge">{recommendedChallenge.chapter}</span>
        </div>
        <div className="mission-spotlight-body">
          <div className="mission-spotlight-icon" aria-hidden="true">
            <RecommendedIcon />
          </div>
          <div className="mission-spotlight-copy">
            <h2>{recommendedChallenge.title}</h2>
            <p>{recommendedChallenge.summary}</p>
            <div className="mission-spotlight-tags">
              <span className="tag">{recommendedChallenge.skill}</span>
              <span className="tag">{recommendedChallenge.difficulty}</span>
              <span className="tag tag-accent">{recommendedChallenge.baseXp} 经验值</span>
            </div>
          </div>
          <button className="primary mission-spotlight-cta" type="button" onClick={onStart}>
            {isNewPlayer ? "进入挑战" : "继续"}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </article>
    </section>
  );
}

function LevelsPage({
  groupedChallenges,
  onStart,
  profile,
}: {
  groupedChallenges: Record<string, Challenge[]>;
  onStart: (challengeId: string) => void;
  profile: PlayerProfile;
}) {
  const completedCount = profile.completedChallengeIds.length;
  const totalCount = CHALLENGES.length;
  const routePercent = Math.round((completedCount / totalCount) * 100);

  return (
    <section className="page-stack">
      <PageTitle eyebrow="关卡" title="修炼路径" copy="按章节选择关卡，在终端输入 Git 命令完成目标。" />
      <div className="levels-strip surface">
        <span>{completedCount}/{totalCount} 关已通关</span>
        <div className="progress-track levels-strip-track" aria-label="全路径进度">
          <div style={{ width: `${routePercent}%` }} />
        </div>
        <strong>{routePercent}%</strong>
      </div>
      <div className="chapter-grid">
        {Object.entries(groupedChallenges).map(([chapter, challenges]) => {
          const chapterDone = challenges.filter((item) => profile.completedChallengeIds.includes(item.id)).length;
          return (
            <article className="surface challenge-map" key={chapter}>
              <header className="chapter-header">
                <div>
                  <h2>{chapter}</h2>
                  <p className="chapter-progress">{chapterDone}/{challenges.length} 关已通关</p>
                </div>
                <span>{challenges.length} 关</span>
              </header>
              <div className="challenge-list">
                {challenges.map((challenge) => (
                  <ChallengeCard
                    challenge={challenge}
                    index={CHALLENGES.findIndex((item) => item.id === challenge.id) + 1}
                    key={challenge.id}
                    onStart={onStart}
                    profile={profile}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ChallengeCard({
  challenge,
  index,
  onStart,
  profile,
}: {
  challenge: Challenge;
  index: number;
  onStart: (challengeId: string) => void;
  profile: PlayerProfile;
}) {
  const Icon = kindIcon[challenge.kind];
  const locked = getLocked(challenge, profile);
  const completed = profile.completedChallengeIds.includes(challenge.id);
  const bestScore = profile.bestScores[challenge.id] ?? 0;
  const statusLabel = locked ? "锁定" : completed ? "已完成" : "可挑战";
  const statusClass = locked ? "locked" : completed ? "done" : "open";
  return (
    <button className={`challenge-card ${statusClass}`} disabled={locked} onClick={() => onStart(challenge.id)} type="button">
      <span className="challenge-index">{String(index).padStart(2, "0")}</span>
      <div className="challenge-icon-wrap">
        <Icon aria-hidden="true" />
      </div>
      <span className="challenge-body">
        <span className="challenge-head">
          <strong>{challenge.title}</strong>
          <span className={`challenge-badge ${statusClass}`}>{statusLabel}</span>
        </span>
        <small>{challenge.skill}</small>
        <small>
          {locked
            ? "完成上一关后解锁"
            : completed
              ? `最高分 ${bestScore} · 可再修炼刷新成绩`
              : `${challenge.difficulty} · 基础 ${challenge.baseXp} 经验值`}
        </small>
      </span>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}

function ProfilePage({
  authBusy,
  authDisplayName,
  authEmail,
  authMessage,
  authMode,
  authPassword,
  authUser,
  onAuthDisplayNameChange,
  onAuthEmailChange,
  onAuthModeChange,
  onAuthPasswordChange,
  onChooseTitle,
  onLogout,
  onReset,
  onSubmitAuth,
  profile,
}: {
  authBusy: boolean;
  authDisplayName: string;
  authEmail: string;
  authMessage: string;
  authMode: "login" | "register";
  authPassword: string;
  authUser: AuthUser | null;
  onAuthDisplayNameChange: (value: string) => void;
  onAuthEmailChange: (value: string) => void;
  onAuthModeChange: (mode: "login" | "register") => void;
  onAuthPasswordChange: (value: string) => void;
  onChooseTitle: (titleId: string) => void;
  onLogout: () => void;
  onReset: () => void;
  onSubmitAuth: () => void;
  profile: PlayerProfile;
}) {
  const apiEnabled = isApiEnabled();
  const activeTitle = getTitleById(profile.activeTitleId);
  const levelInfo = getLevelInfo(profile.level);
  const levelProgress = getLevelProgress(profile.xp);
  const completedCount = profile.completedChallengeIds.length;
  const titleCount = profile.unlockedTitleIds.length;
  const routePercent = Math.round((completedCount / CHALLENGES.length) * 100);

  // 按技能方向统计掌握进度
  const skillStats = (Object.keys(SKILL_KIND_LABELS) as Challenge["kind"][]).map((kind) => {
    const total = CHALLENGES.filter((item) => item.kind === kind).length;
    const done = CHALLENGES.filter(
      (item) => item.kind === kind && profile.completedChallengeIds.includes(item.id),
    ).length;
    return { kind, label: SKILL_KIND_LABELS[kind], done, total };
  });

  return (
    <section className="profile-layout">
      <article className="surface profile-hero">
        <div className="profile-hero-top">
          <div className="profile-identity">
            <div className="avatar profile-avatar" aria-hidden="true"><Sparkles /></div>
            <div className="profile-identity-copy">
              <p className="eyebrow">个人中心</p>
              <h1>Lv.{levelInfo.level} {levelInfo.name}</h1>
              <p className="profile-title-line">{activeTitle.name}</p>
              <p className="profile-title-flavor">{activeTitle.flavorText}</p>
            </div>
          </div>
          <div className="profile-hero-actions">
            <NavLink className="primary" to="/">继续修炼</NavLink>
            <NavLink className="secondary" to="/levels">查看关卡</NavLink>
          </div>
        </div>

        <div className="profile-level-block">
          <div className="profile-level-head">
            <span>升级进度 · {levelProgress.current}/{levelProgress.required} 经验值</span>
            <strong>{levelProgress.percent}%</strong>
          </div>
          <div className="progress-track" aria-label="等级经验进度">
            <div style={{ width: `${levelProgress.percent}%` }} />
          </div>
        </div>

        <div className="profile-stat-grid">
          <div className="profile-stat-card">
            <strong>{profile.xp}</strong>
            <span>总经验值</span>
          </div>
          <div className="profile-stat-card">
            <strong>{profile.totalScore}</strong>
            <span>总积分</span>
          </div>
          <div className="profile-stat-card">
            <strong>{completedCount}/{CHALLENGES.length}</strong>
            <span>已通关</span>
          </div>
          <div className="profile-stat-card">
            <strong>{titleCount}/{TITLE_RULES.length}</strong>
            <span>已解锁称号</span>
          </div>
        </div>
      </article>

      <div className="profile-body">
        <div className="profile-main">
          <article className="surface profile-section">
            <div className="profile-section-head">
              <h2>学习进度</h2>
              <span className="profile-section-meta">全路径 {routePercent}%</span>
            </div>
            <div className="profile-route-bar">
              <div className="progress-track">
                <div style={{ width: `${routePercent}%` }} />
              </div>
            </div>
            <div className="skill-strip">
              {skillStats.map((skill) => {
                const percent = skill.total === 0 ? 0 : Math.round((skill.done / skill.total) * 100);
                const mastered = skill.done >= skill.total && skill.total > 0;
                return (
                  <div className={`skill-row ${mastered ? "mastered" : ""}`} key={skill.kind}>
                    <span className="skill-row-label">{skill.label}</span>
                    <div className="progress-track skill-row-track">
                      <div style={{ width: `${percent}%` }} />
                    </div>
                    <span className="skill-row-count">{skill.done}/{skill.total}</span>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="surface profile-section">
            <div className="profile-section-head">
              <h2>称号成就</h2>
              <span className="profile-section-meta">点击已解锁称号切换展示</span>
            </div>
            <div className="titles-grid">
              {TITLE_RULES.map((title) => {
                const unlocked = profile.unlockedTitleIds.includes(title.id);
                const active = profile.activeTitleId === title.id;
                return (
                  <button
                    className={`title-card ${unlocked ? "unlocked" : "locked"} ${active ? "active" : ""}`}
                    disabled={!unlocked}
                    key={title.id}
                    onClick={() => onChooseTitle(title.id)}
                    type="button"
                  >
                    <span className="title-card-name">{title.name}</span>
                    {active && <span className="title-card-badge">当前</span>}
                    <small>{unlocked ? title.flavorText : "尚未悟得此道"}</small>
                  </button>
                );
              })}
            </div>
          </article>
        </div>

        <aside className="profile-aside">
          <article className="surface profile-section profile-account">
            <div className="profile-section-head">
              <h2>账号与云同步</h2>
            </div>
            <p className="profile-account-note">
              {apiEnabled
                ? "登录后通关时自动同步经验值、关卡与称号。"
                : "未配置 VITE_API_BASE_URL，云同步已关闭。"}
            </p>
            {authUser ? (
              <div className="auth-session">
                <div className="auth-user-card">
                  <div className="auth-avatar" aria-hidden="true">{authUser.displayName.slice(0, 1)}</div>
                  <div>
                    <strong>{authUser.displayName}</strong>
                    <p className="muted">{authUser.email}</p>
                  </div>
                </div>
                <button className="secondary profile-aside-btn" type="button" onClick={onLogout}>退出登录</button>
              </div>
            ) : (
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSubmitAuth();
                }}
              >
                <div className="auth-tabs">
                  <button
                    className={authMode === "login" ? "active" : ""}
                    type="button"
                    onClick={() => onAuthModeChange("login")}
                  >
                    登录
                  </button>
                  <button
                    className={authMode === "register" ? "active" : ""}
                    type="button"
                    onClick={() => onAuthModeChange("register")}
                  >
                    注册
                  </button>
                </div>
                {authMode === "register" && (
                  <label>
                    昵称
                    <input
                      value={authDisplayName}
                      onChange={(event) => onAuthDisplayNameChange(event.target.value)}
                      placeholder="Git 少侠"
                      required
                    />
                  </label>
                )}
                <label>
                  邮箱
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(event) => onAuthEmailChange(event.target.value)}
                    placeholder="player@example.com"
                    required
                  />
                </label>
                <label>
                  密码
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(event) => onAuthPasswordChange(event.target.value)}
                    placeholder="至少 6 位"
                    minLength={6}
                    required
                  />
                </label>
                <button className="primary profile-aside-btn" type="submit" disabled={authBusy || !apiEnabled}>
                  {authBusy ? "处理中…" : authMode === "register" ? "注册并登录" : "登录"}
                </button>
              </form>
            )}
            {authMessage && <p className="auth-message">{authMessage}</p>}
          </article>

          <article className="surface profile-section profile-settings">
            <div className="profile-section-head">
              <h2>数据管理</h2>
            </div>
            <p className="profile-settings-note">重置会清空本地修炼进度，此操作不可撤销。</p>
            <button className="secondary profile-aside-btn profile-reset-btn" type="button" onClick={onReset}>
              <RotateCcw aria-hidden="true" /> 重置本地进度
            </button>
          </article>
        </aside>
      </div>
    </section>
  );
}

function PageTitle({ copy, eyebrow, title }: { copy: string; eyebrow: string; title: string }) {
  return (
    <div className="section-title page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

export default App;
