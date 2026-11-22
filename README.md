# 伴侣动物保护平台

![version](https://img.shields.io/badge/version-v1.0.0-4CAF50) ![license](https://img.shields.io/badge/license-MIT-blue) ![platform](https://img.shields.io/badge/platform-WeChat%20MiniProgram-07C160)

面向伴侣动物（宠物）饲养场景的微信小程序：饲养前能查清自己该负什么责任，饲养中遇到虐待、遗弃、非法交易，能找到地方把线索递上去。

原生小程序 + 微信云开发，AppID `wx713816f53bfe6b44`，云开发环境 `cloud1-5g88rmqa7bde7156`。

## 功能

- **责任明晰** — 用日常语言检索法规（对接法律之星向量检索），可按地区、时效性、效力级别筛选，命中后看全文
- **资质查询** — 上传身份、居住、宠物来源、健康防疫、宠物身份标识 5 类材料，由 AI 审核给出结论、评级与逐项理由
- **监督举报** — 提交举报工单（标题、内容、联系方式），查看工单列表、详情与处理状态
- **动态** — 发布图文、浏览、点赞、评论
- **我的** — 微信静默登录、资料编辑、认证状态

## 页面与云函数对照

| 模块 | 页面 | 云函数 |
| --- | --- | --- |
| 功能入口 | `pages/function` | — |
| 责任明晰 | `pages/responsibility`、`pages/lawDetail`、`pages/testLegal` | `legalSearch`、`httpRequest` |
| 资质查询 | `pages/qualification` | `qualificationReview` |
| 监督举报 | `pages/report`、`pages/ticket-submit`、`pages/ticket-list`、`pages/ticket-detail` | `ticket-add`、`ticket-list`、`ticket-detail`、`ticket-update` |
| 动态 | `pages/dynamic`、`pages/postEdit`、`pages/postDetail` | `addComment`、`deleteComment`、`getComments`、`likeComment` |
| 我的 | `pages/profile`、`pages/login`、`pages/updateProfile`、`pages/about`、`pages/index` | `getOpenId` |

## 技术架构

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | 微信小程序原生框架 | WXML / WXSS / JS，无第三方 UI 库 |
| 后端 | 微信云开发 | 12 个云函数，云数据库（`users` 等集合）、云存储 |
| 法规检索 | 法律之星 OpenAPI | 取 Token 后调向量检索接口，再按 rjs8 取全文 |
| 资质审核 | DeepSeek Chat API | 单次对话请求，返回结构化审核结论 |

## 目录结构

```
companion-animal-protection/
├── miniprogram/                  # 小程序主体
│   ├── app.js                    # 云开发初始化、静默登录、用户数据同步
│   ├── app.json                  # 页面注册与 tabBar
│   ├── app.wxss                  # 全局样式
│   ├── components/               # 自定义组件
│   ├── images/                   # 图标与占位图
│   ├── utils/                    # 节流等工具函数
│   └── pages/
│       ├── function/             # 功能首页（tab）
│       ├── dynamic/              # 动态（tab）
│       ├── profile/              # 我的（tab）
│       ├── responsibility/       # 责任明晰：法规检索
│       ├── lawDetail/            # 法规详情
│       ├── qualification/        # 资质上传与 AI 审核
│       ├── report/               # 监督举报
│       ├── ticket-submit/ ticket-list/ ticket-detail/
│       ├── postEdit/ postDetail/
│       ├── login/ index/ about/ updateProfile/
│       └── testLegal/            # 接口联调页
├── cloudfunctions/               # 云函数
│   ├── getOpenId/                # 登录：换取 openid
│   ├── legalSearch/ httpRequest/ # 法律之星接口封装
│   ├── qualificationReview/      # 资质审核
│   ├── ticket-*/                 # 举报工单增查改
│   └── *Comment*/                # 评论与点赞
├── project.config.json
├── project.private.config.json
├── uploadCloudFunction.sh
├── CHANGELOG.md
└── LICENSE
```

## 快速开始

1. 微信开发者工具导入本目录，AppID 已写在 `project.config.json` 中
2. 右键 `cloudfunctions` 下每个云函数，选择「上传并部署：云端安装依赖」
3. 在云开发控制台为 `legalSearch`、`qualificationReview` 配置密钥环境变量（见下）
4. 编译预览；法规检索可先在 `pages/testLegal` 里跑一遍连通性

## 关键配置

### 法规检索（法律之星）

- 认证：`POST /api/auth/login`，body 传 `appid`、`appsecret`，取返回的 `Authorization`；Token 在云函数内缓存 2 小时，调用时直接放进 `Authorization` 头，不加 Bearer 前缀
- 检索：`GET /api/lawData/xlquery`，参数 `vector`（必填）、`rows`（默认 10），筛选项 `areaFacet`、`lawstatexlsFacet`、`xls`
- 详情：`GET /api/lawData/detail`，参数 `rjs8`
- 云函数按 `action` 分发：`search`、`detail`、`test`、`debug`；返回统一为 `success`、`message`、`data.result`、`data.total`

### 资质审核（DeepSeek）

云函数 `qualificationReview` 收到 5 类材料后请求 `/chat/completions`，期望模型返回：`passed`、`summary`、`details`（5 项，每项含 `type`、`passed`、`reason`、`suggestion`）、`suggestion`。解析失败会落到兜底的模拟结果。

### 密钥

**密钥不进仓库。** 用云函数环境变量注入，代码中以 `process.env.LEGAL_STAR_APP_ID`、`process.env.LEGAL_STAR_APP_SECRET`、`process.env.DEEPSEEK_API_KEY` 读取；`config.json` 只保留 Base URL 与端点路径。

## 版本与发布

- 当前版本 `v1.0.0`（2026-11-22），变更明细见 [CHANGELOG.md](CHANGELOG.md)
- 发布分支 `develop`（仓库默认分支），发布标签 `v1.0.0`
- 后续版本按语义化版本号递增：功能新增走 `1.x.0`，修复走 `1.x.y`

## 待完善

- 资质审核还没把材料图片编码进请求体，模型看不到图；`callDeepSeekReview` 里的 `prompt` 变量也未定义，请求会失败并回落到模拟结果，需补上提示词构建与图片编码
- 密钥目前仍是硬编码读取（`config.json` 与云函数常量），需迁移到环境变量
- `pages/home`、`pages/support` 未在 `app.json` 注册，属脚手架遗留页面，可清理
- 举报工单目前只有提交与查看，缺少后台审核端

## 许可证

[MIT](LICENSE) © 2026 吴桐（Wu Tong）
