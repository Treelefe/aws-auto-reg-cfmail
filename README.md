# AWS Builder ID Auto Registration (CF Mail Edition)

> AWS Builder ID 自动注册工具 - 基于 Cloudflare 域名邮箱的浏览器扩展

一键自动化注册 AWS Builder ID 账号的 Chrome 浏览器扩展，支持批量注册、多窗口并发、**自定义 Cloudflare Worker 邮箱服务**、OIDC Token 管理与验证。

## 声明

本项目是基于 [Specia1z/AWS-BuildID-Auto-For-Ext](https://github.com/Specia1z/AWS-BuildID-Auto-For-Ext) 的二次开发版本。

**主要改进：**
- 支持自定义 Cloudflare Worker 临时邮箱服务
- 可在插件界面配置邮箱服务参数
- 适配 Cloudflare Email Routing + Worker 架构

感谢原作者的开源贡献！

## 功能特性

- **一键注册**：自动完成 AWS Builder ID 注册全流程
- **批量注册**：支持设置注册数量，自动循环注册
- **多窗口并发**：支持 1-3 个窗口同时注册
- **自定义邮箱服务**：支持配置自己的 CF Worker 邮箱 API
- **自动填表**：自动填写邮箱、姓名、验证码、密码
- **Token 获取**：自动完成 OIDC 设备授权流程
- **Token 验证**：批量验证 Token 有效性
- **历史管理**：保存注册历史，支持 JSON/CSV 导出

## 前置要求

### 1. Cloudflare 域名邮箱服务

你需要部署自己的 Cloudflare Worker 邮箱服务，用于接收验证码邮件。

推荐项目：
- [dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email)

部署后你将获得：
- `WORKER_DOMAIN`：Worker API 域名（如 `apimail.example.com`）
- `EMAIL_DOMAIN`：邮箱域名（如 `example.com`）
- `ADMIN_PASSWORD`：管理密码

### 2. Chrome 浏览器

基于 Manifest V3，需要 Chrome 88+ 版本。

## 安装步骤

### 方式一：直接安装

1. 前往 [Releases](../../releases) 下载最新版本的 `.zip` 文件
2. 解压到本地目录
3. 打开 Chrome，访问 `chrome://extensions/`
4. 启用右上角「开发者模式」
5. 点击「加载已解压的扩展程序」，选择解压目录
6. **重要**：点击扩展详情，启用「在无痕模式下允许」

### 方式二：从源码安装

```bash
git clone https://github.com/Treelefe/aws-auto-reg-cfmail.git
cd aws-auto-reg-cfmail
```

然后按上述步骤 3-6 加载扩展。

## 配置说明

### 邮箱服务配置

1. 点击扩展图标打开弹窗
2. 找到「邮箱服务配置」区域，点击「展开」
3. 填写以下信息：
   - **Worker 域名**：你的 CF Worker API 域名（不含 `https://`）
   - **邮箱域名**：接收邮件的域名
   - **管理密码**：Worker 管理密码
4. 点击「保存配置」

### 注册参数

- **注册数量**：单次批量注册的账号数量（1-100）
- **并发窗口**：同时打开的注册窗口数（建议 1-2）

## 使用方法

1. 确保已配置邮箱服务
2. 设置注册数量和并发窗口数
3. 点击「开始注册」
4. 等待自动完成注册流程
5. 在「注册历史」中查看结果
6. 可点击「验证」检查 Token 状态
7. 使用「JSON」或「CSV」导出账号信息

## 项目结构

```
aws-auto-reg-cfmail/
├── background/
│   └── service-worker.js    # 后台服务：会话管理、API 调用
├── content/
│   └── content.js           # 内容脚本：页面自动化
├── popup/
│   ├── popup.html           # 弹窗界面
│   ├── popup.css            # 样式
│   └── popup.js             # 交互逻辑
├── lib/
│   ├── mail-api.js          # 临时邮箱 API 封装
│   ├── oidc-api.js          # AWS OIDC 认证 API
│   └── utils.js             # 工具函数
├── icons/                   # 扩展图标
├── manifest.json            # 扩展清单
└── README.md
```

## 工作流程

```
用户点击开始
     │
     ▼
Service Worker 创建会话
     │
     ├──→ Mail API: 创建临时邮箱
     │
     ├──→ OIDC API: 注册客户端 + 设备授权
     │
     ▼
打开无痕窗口（授权 URL）
     │
     ▼
Content Script 自动填表
     │
     ├──→ 填写邮箱 → 填写姓名 → 获取验证码 → 填写密码
     │
     ▼
Service Worker 轮询 Token
     │
     ▼
获取成功 → 保存账号 → 可选验证 → 导出结果
```

## 常见问题

### Q: 提示"创建邮箱失败: 401"？

A: 邮箱服务配置错误。请检查：
- Worker 域名是否正确（不要包含 `https://`）
- 管理密码是否正确
- CF Worker 服务是否正常运行

### Q: 验证码获取超时？

A: 可能原因：
- 邮件延迟，请耐心等待
- 邮箱服务异常，检查 Worker 日志
- AWS 发送邮件失败，尝试重新注册

### Q: 页面自动化卡住？

A: 可能原因：
- AWS 页面结构变化，需要更新选择器
- 网络延迟，等待页面加载
- 尝试刷新页面或重新开始

### Q: Token 显示"封禁"或"无效"？

A: AWS 可能对账号进行了限制。这是正常现象，部分账号可能无法使用。

## 免责声明

本工具仅供学习和研究使用。使用本工具产生的任何后果由使用者自行承担。请遵守 AWS 服务条款和相关法律法规。

## 致谢

- [Specia1z/AWS-BuildID-Auto-For-Ext](https://github.com/Specia1z/AWS-BuildID-Auto-For-Ext) - 原始项目
- [dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) - CF 临时邮箱方案

## License

MIT License
