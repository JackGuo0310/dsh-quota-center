# dsh-quota-center · 额度中心

DSH 网页端右下角的统一额度面板，基于 [wenzetan/dsh-quota-panel](https://github.com/wenzetan/dsh-quota-panel) 维护，保留原架构和 MIT 许可证。

| 服务商 | 显示内容 | 凭据来源 |
| --- | --- | --- |
| ChatGPT Plus / Pro | Codex 订阅实际窗口、剩余比例、重置时间 | 本机 Codex 登录 |
| DeepSeek | 人民币总余额、充值与赠送余额 | `DEEPSEEK_API_KEY` |
| OpenCode Go | 5 小时、每周、每月剩余比例和重置时间 | `OPENCODE_GO_API_KEY` 或本机 OpenCode Go 凭据 |

三家同时显示，与当前选择的模型无关。缺凭据和请求失败只影响对应条目。
ChatGPT 订阅额度与 OpenAI API 余额不同；OpenCode Zen 钱包暂不支持。

## 安装

最低支持 DSH **0.2.1-rc.2**（peer 范围 `>=0.2.1-rc.2`，已实测该版本），需要 Node.js 22 或更高版本。

本机开发安装：

```powershell
cd D:\Github\dsh-quota-center
npm ci --legacy-peer-deps
npm run check
dsh plugin --profile web add "link:D:/Github/dsh-quota-center"
dsh web
```

GitHub 发布后安装：

```powershell
dsh plugin --profile web add "github:JackGuo0310/dsh-quota-center"
```

安装后重新启动 `dsh web`。若 DSH 已自动发现插件，可以直接刷新页面。
GitHub 安装直接使用仓库提交的 `lib/`，无需修改 DSH 全局目录。

## 配置

- **ChatGPT**：先在 Codex 中使用 ChatGPT 账号登录。插件只读取 `$CODEX_HOME/auth.json`，默认 `%USERPROFILE%\.codex\auth.json`。不登录、不刷新、不写回 Token。过期或 401 时请在 Codex 重新登录。系统钥匙串存储尚不支持；OpenAI API Key 不能替代订阅登录。
- **DeepSeek**：沿用 DSH 已配置的 `DEEPSEEK_API_KEY`。查询官方 `/user/balance`，只读取 CNY 项，不把其他币种当成人民币。
- **OpenCode Go**：优先读取 DSH 的 `OPENCODE_GO_API_KEY`；其次只读 `$XDG_DATA_HOME/opencode/auth.json` 的 `opencode-go` 项，默认 `%USERPROFILE%\.local\share\opencode\auth.json`。不会混用 `opencode` 的 Zen Key。未订阅、未续费或无窗口数据时不虚构额度。

点击面板的 **⚙**，可开关单个服务商、设置刷新间隔、预警阈值和每家独立的 HTTP/HTTPS 代理。默认每 60 秒刷新；隐藏页面暂停查询；手动刷新不并发重复请求。代理只接受 `http://`、`https://`。

面板跟随 DSH 浅色/深色主题，支持拖动。展开后点击面板外部或将键盘焦点移出，会自动收起；顶部按钮固定保留，设置内容单独滚动。设置保存在当前浏览器，日期时间使用北京时间。API Key、OAuth Token 不进入浏览器。

代理 URL 是浏览器设置，建议使用无密码的本机代理。需要代理密码时，通过宿主配置的 `proxies` 命名映射配置，勿将密码填进前端。

## 更新与卸载

GitHub 安装更新（发布后）：

```powershell
dsh plugin --profile web update dsh-quota-center --latest
```

本地 link 更新：在源码目录修改、运行 `npm run check`，然后重新启动 DSH 以确保宿主代码重新载入。link 路径应保留。

卸载：

```powershell
dsh plugin --profile web remove dsh-quota-center
```

卸载后重新启动 DSH。插件不会更改模型配置或删除其他插件。

## 开发与验证

```powershell
npm ci --legacy-peer-deps
npm run check
npm pack --dry-run
```

`src/index.ts` 负责宿主查询与 RPC，`src/client.ts` 负责 DSH overlay；非稳定订阅响应适配集中在 `src/adapters/`。源码编译到 `lib/` 并一同提交。测试仅使用临时假凭据和本机代理，不读取开发者真实登录。

ChatGPT 与 OpenCode Go 接口可能随上游变化。实际验证状态和已知限制见 [本机验证记录](docs/validation.md)。

## 许可证

[MIT](LICENSE)。原版权：Copyright (c) 2026 dsh-quota-panel contributors。
