import { describe, expect, it, vi } from "vitest";
import { loginAccount, registerAccount } from "./apiClient";

describe("api client", () => {
  it("registers with the backend auth endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          accessToken: "token-1",
          user: { id: "1", email: "a@b.com", displayName: "少侠" },
        },
      }),
    });

    const session = await registerAccount("a@b.com", "123456", "少侠", fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
    expect(session.accessToken).toBe("token-1");
  });

  it("surfaces backend error messages", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: "EMAIL_ALREADY_EXISTS", message: "邮箱已注册" } }),
    });

    await expect(loginAccount("a@b.com", "123456", fetcher)).rejects.toThrow("邮箱已注册");
  });
});
