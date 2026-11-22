# 更新日志

## [v1.0.1] - 2026-11-22

修复资质审核链路，把密钥从代码里摸出去。

### 修复

- `qualificationReview` 云函数中 `content: prompt` 引用了未定义的变量、`buildReviewPrompt()` 从未被调用，请求必然失败并回落到 `getMockReviewResult()`，导致审核结果是随机模拟
- 前端 `startReview` 主动丢弃云函数返回值并调用 `showMockResult()`，评级与分数由 `Math.random()` 生成
- 前端 `getUserInfo()` 读的是 `app.globalData.openId`（未定义），改为 `openid`

### 变更

- 资质审核密钥与模型改为环境变量：`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`DEEPSEEK_VISION_MODEL` 等
- 新增可选视觉核验：配置 `DEEPSEEK_VISION_MODEL` 后，云函数会下载材料、base64 编码并随请求发送；未配置时只做材料齐备性初筛，结果标 `verification=materials_only`，前端明确提示需人工复核
- 法律之星 `APP_ID` / `APP_SECRET` 改为从 `LEGAL_STAR_APP_ID` / `LEGAL_STAR_APP_SECRET` 读取，`config.json` 只保留端点与超时
- 审核返回新增 `score`、`verification`、`imagesAnalyzed`、`model`、`missingMaterials` 等字段；`saveResult` 写入集合 `qualificationReviews`

### 注意

- 历史上以明文提交的法律之星与 DeepSeek 密钥建议在两家控制台轮换后再启用

## [v1.0.0] - 2026-11-22

首个版本：功能实现与仓库信息整理同步落地。

### 功能

- **责任明晰**：接入法律之星 OpenAPI，支持自然语言法规检索（向量检索）、地区 / 时效性 / 效力级别筛选与法规全文查看
- **资质查询**：身份、居住、宠物来源、健康防疫、宠物身份标识 5 类材料上传，AI 审核给出结论、评级与逐项理由
- **监督举报**：举报工单的提交、列表、详情与状态流转
- **动态**：图文发布、浏览、点赞、评论
- **我的**：微信静默登录、资料编辑、认证状态

### 工程

- 小程序端 17 个注册页面、12 个云函数，基于微信云开发（环境 `cloud1-5g88rmqa7bde7156`）
- 仓库由 `Animals` 更名为 `companion-animal-protection`
- README 按真实形态重写：补充页面 / 云函数对照、接口口径、目录结构与部署步骤
- 清理 quickstart 脚手架残留：`project.config.json` 项目名与无效调试项、`uploadCloudFunction.sh` 部署脚本参数化
- 补充 MIT LICENSE 与本更新日志
