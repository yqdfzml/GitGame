import { Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { GitBranch } from "lucide-react";
import { isApiEnabled, loginAccount, registerAccount } from "../game/apiClient";
import type { AuthSession, AuthUser } from "../game/types";

/**
 * 账号登录/注册独立页面。
 * 功能：与游戏主流程分离，专门处理云存档身份认证。
 * 参数：authUser - 当前登录用户；onSuccess - 登录成功回调。
 * 返回值：登录页 JSX。
 */
export function LoginPage({
  authUser,
  onSuccess,
}: {
  authUser: AuthUser | null;
  onSuccess: (session: AuthSession) => Promise<void>;
}) {
  const navigate = useNavigate();
  const apiEnabled = isApiEnabled();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  if (authUser) {
    return <Navigate replace to="/profile" />;
  }

  /**
   * 提交登录或注册表单。
   * 功能：调用认证 API，成功后跳转个人中心。
   * 参数：无。
   * 返回值：Promise。
   */
  const submitAuthForm = () => {
    if (authBusy) {
      return Promise.resolve();
    }

    setAuthBusy(true);
    setAuthMessage("");

    const task =
      authMode === "register"
        ? registerAccount(authEmail, authPassword, authDisplayName)
        : loginAccount(authEmail, authPassword);

    return task
      .then((session) => {
        return onSuccess(session).then(() => {
          navigate("/profile");
        });
      })
      .catch((error: Error) => {
        setAuthMessage(error.message || "认证失败，请稍后重试。");
      })
      .finally(() => {
        setAuthBusy(false);
      });
  };

  return (
    <section className="auth-page">
      <article className="surface auth-page-card">
        <div className="auth-page-brand">
          <GitBranch aria-hidden="true" />
          <div>
            <p className="eyebrow">云存档</p>
            <h1>登录 GitGame</h1>
            <p className="auth-page-copy">登录后同步经验值、关卡进度与称号，换设备也能继续修炼。</p>
          </div>
        </div>

        {!apiEnabled && (
          <p className="auth-page-warning">当前未配置 VITE_API_BASE_URL，云同步功能处于关闭状态。</p>
        )}

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitAuthForm();
          }}
        >
          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("login")}
            >
              登录
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("register")}
            >
              注册
            </button>
          </div>

          {authMode === "register" && (
            <label>
              昵称
              <input
                value={authDisplayName}
                onChange={(event) => setAuthDisplayName(event.target.value)}
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
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="player@example.com"
              required
            />
          </label>

          <label>
            密码
            <input
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="至少 6 位"
              minLength={6}
              required
            />
          </label>

          <button className="primary auth-page-submit" type="submit" disabled={authBusy || !apiEnabled}>
            {authBusy ? "处理中…" : authMode === "register" ? "注册并登录" : "登录"}
          </button>
        </form>

        {authMessage && <p className="auth-message">{authMessage}</p>}

        <p className="auth-page-footnote">
          未登录也可本地修炼，进度保存在当前浏览器。
        </p>
      </article>
    </section>
  );
}
