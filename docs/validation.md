# 本机验证记录

日期：2026-10-24（北京时间）。DSH：0.2.1-rc.2；Node.js：24.21.0；Windows。

## 已完成

- 从上游克隆并保留 Git 历史和 MIT 版权。原目录为空，无现有代码覆盖。
- GitHub 目标 `JackGuo0310/dsh-quota-center` 已存在且为空（无远端 refs），不是 GitHub Fork 网络成员。直接保留现有个人仓库并推送完整上游历史，保留 `upstream`，没有删除或重建仓库。
- 本机 `gh` 未安装；通过 Git Credential Manager 确认 GitHub 账号为 JackGuo0310，未输出凭据。
- `npm run check`：现有双端检查通过，新增 7 项专项测试通过。覆盖三家固定配置、缺凭据、实际窗口归一化、剩余百分比、401/403/429、超时异常、凭据不写回、Go 与 Zen 凭据隔离、CONNECT 不携带上游认证头，以及设置在配置请求失败时安全渲染。
- 本机真实 web profile 已通过 `link:D:/Github/dsh-quota-center` 安装。默认 60 秒、手动刷新、浅色和深色布局、三家同时显示、服务商开关及页面重载后的设置恢复已手工验证；主题已恢复为跟随系统。
- ChatGPT Plus：使用真实 Codex 凭据只读查询成功，返回的窗口按实际时长显示，包含剩余比例与重置时间。未调用 OAuth 登录或刷新接口。
- DeepSeek：真实余额接口查询成功，CNY 总余额与充值、赠送明细显示正常。
- OpenCode Go：本机 Go 专属 Key 被读取，真实接口返回 HTTP 401。用户确认当前没有有效订阅；401 本身不用于推断具体订阅状态，面板显示未知值及错误，不填充虚构窗口额度。
- 隔离 DSH_HOME 中安装同一本地 link，真实启动 DSH，验证带鉴权 specs RPC 返回三家、fetch-all 将缺凭据错误局限于各行、无鉴权请求返回 401。停止并再次启动该测试进程后，原浏览器会话凭据仍有效，三家配置恢复。未停止用户原有 DSH 进程。
- 已在隔离 web profile 中通过 `github:JackGuo0310/dsh-quota-center#main` 实际安装，并启动宿主成功返回三家 specs；本机日常 web profile 仍保留 link。
- `npm pack --dry-run` 成功，产物包含宿主、客户端、适配器、vendored schema 和插件 patch；不包含真实凭据及本地测试目录。
- npm registry 查询 `dsh-quota-center` 返回 404，当前未占用；没有执行 npm 发布。

## 验证边界

- ChatGPT Pro 没有真实账号，只有响应样例测试。
- OpenCode Go 的有效订阅三窗口只有接口样例测试；当前真实账号无法验证成功路径。
- 403、429、过期 Token、超时等异常主要以隔离假凭据/模拟响应测试，未人为触发真实账号限流。
- 代理用本机 HTTP 转发与 CONNECT 服务器验证；未用真实账号经过有密码的远端 HTTPS 代理。
- GitHub Actions 的 Windows 与 Ubuntu 检查均已通过（测试、构建产物一致性、打包检查）。支持的 DSH 版本固定为当前已验证的 0.2.1-rc.2。
- 用户取消 Zen 接入，不读取控制台 Cookie，不实现钱包余额估算。

## 维护策略

保留上游成熟适配器供显式配置使用，默认只启用三家。README 精简为安装、配置、更新、卸载和维护信息。CI 仅运行验证与打包检查，不自动发布 npm、创建标签或发布版本。

后续如 Codex 登录过期，由用户在 Codex 重新登录；插件不会刷新或修改它的凭据。
