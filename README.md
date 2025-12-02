# 法律智能检索系统 - 法律之星API集成

## 📋 项目概述

**法律智能检索系统**是一个基于微信小程序的法律法规智能搜索平台，集成法律之星专业数据库，提供精准、高效的法律法规查询服务。系统采用先进的向量检索技术，支持自然语言搜索和智能语义匹配。

## ✨ 核心功能

### 🔍 智能搜索

- 

  **自然语言处理**：支持日常用语法律问题检索

- 

  **向量相似度匹配**：基于语义的精准内容检索

- 

  **多维度筛选**：支持地区、时效性、效力级别筛选

- 

  **相关度排序**：按匹配度智能排序搜索结果

### 📄 详情查看

- 

  **完整法规展示**：显示法规全文和元数据

- 

  **格式化内容**：智能清理和格式化法律文本

- 

  **一键复制**：支持法规内容快速复制

- 

  **分享功能**：便捷的内容分享

### 🎯 特色功能

- 

  **快捷搜索标签**：常用法律问题一键搜索

- 

  **实时搜索建议**：输入时提供搜索建议

- 

  **搜索历史记录**：自动保存搜索记录

- 

  **离线缓存**：重要法规内容本地缓存

## 🏗️ 技术架构

### 前端技术栈

- 

  **微信小程序框架**：原生小程序开发

- 

  **WXML/WXSS**：页面结构和样式

- 

  **JavaScript**：业务逻辑处理

- 

  **云开发**：微信云函数和云数据库

### 后端集成

- 

  **法律之星API**：专业法律数据库接口

- 

  **RESTful API**：标准的HTTP接口调用

- 

  **JWT认证**：安全的API访问认证

- 

  **向量检索**：基于向量的智能搜索

### 云服务

- 

  **微信云函数**：服务器less架构

- 

  **云存储**：静态资源存储

- 

  **云数据库**：用户数据和缓存管理

## 📦 项目结构

复制

```
legal-search-miniprogram/
├── cloudfunctions/          # 云函数目录
│   ├── legal-search/        # 法律搜索主函数
│   │   ├── index.js         # 主逻辑文件
│   │   ├── config.json      # API配置
│   │   └── package.json     # 依赖配置
│   └── http-request/        # HTTP请求工具
├── pages/                   # 页面目录
│   ├── responsibility/      # 搜索主页
│   │   ├── responsibility.js
│   │   ├── responsibility.wxml
│   │   ├── responsibility.wxss
│   │   └── responsibility.json
│   ├── lawDetail/           # 法规详情页
│   └── testLegal/           # 测试页面
├── images/                  # 图片资源
├── app.js                   # 小程序入口
├── app.json                 # 全局配置
├── app.wxss                 # 全局样式
└── project.config.json      # 项目配置
```

## 🚀 快速开始

### 环境要求

- 

  微信开发者工具最新版

- 

  已注册的微信小程序账号

- 

  法律之星API访问权限（APP_ID和APP_SECRET）

### 安装部署

1. 

   **克隆项目**

bash

复制

```
git clone <项目地址>
```

1. 

   **安装依赖**

bash

复制

```
cd cloudfunctions/legal-search
npm install
```

1. 

   **配置API密钥**

   在 `cloudfunctions/legal-search/config.json`中配置：

json

复制

```
{
  "LEGAL_STAR_CONFIG": {
    "BASE_URL": "https://api.law-star.com",
    "APP_ID": "您的APP_ID",
    "APP_SECRET": "您的APP_SECRET",
    "ENDPOINTS": {
      "GET_TOKEN": "/api/auth/login",
      "VECTOR_QUERY": "/api/lawData/xlquery", 
      "LAW_DETAIL": "/api/lawData/detail"
    }
  }
}
```

1. 

   **部署云函数**

   - 

     在微信开发者工具中右键云函数目录

   - 

     选择"上传并部署：云端安装依赖"

2. 

   **编译运行**

   - 

     在微信开发者工具中点击"编译"

   - 

     预览或上传体验版

## 🔧 核心配置

### API端点配置

javascript

下载

复制

运行

```
// 认证接口
POST /api/auth/login
Body: { appid, appsecret }

// 向量搜索
GET /api/lawData/xlquery?vector=关键词&rows=数量

// 法规详情  
GET /api/lawData/detail?rjs8=法规ID
```

### 搜索参数说明

javascript

下载

复制

运行

```
{
  vector: "搜索关键词",     // 必填，搜索内容
  rows: 10,               // 返回条数，默认10
  areaFacet: "地区",       // 地区筛选
  lawstatexlsFacet: "时效性", // 时效性筛选
  xls: "效力级别"         // 效力级别筛选
}
```

## 💡 使用指南

### 基本搜索

1. 

   在搜索框输入法律问题（如"劳动合同解除"）

2. 

   点击搜索或按回车键

3. 

   查看匹配的法规列表

4. 

   点击条目查看详情

### 高级搜索

- 

  **地区筛选**：限定特定地区的法规

- 

  **时效性筛选**：按现行有效/已失效筛选

- 

  **效力级别**：按法律效力等级筛选

### 快捷操作

- 

  **常用搜索**：点击快捷标签快速搜索

- 

  **内容复制**：详情页一键复制法规内容

- 

  **结果分享**：分享特定法规给他人

## 🐛 故障排除

### 常见问题

**Q: 搜索返回"未找到相关法规"**

A: 检查网络连接，确认API密钥配置正确，尝试更具体的关键词

**Q: 认证失败错误**

A: 验证APP_ID和APP_SECRET是否正确，检查API服务状态

**Q: 详情页加载失败**

A: 确认法规ID有效，检查网络连接

### 调试模式

在测试页面开启详细日志：

javascript

下载

复制

运行

```
// 在测试页面调用
wx.cloud.callFunction({
  name: 'legalSearch',
  data: { action: 'test', debug: true }
})
```

## 📊 API响应格式

### 搜索成功响应

json

复制

```
{
  "success": true,
  "message": "查询成功",
  "data": {
    "result": [
      {
        "lawId": "法规ID",
        "lawName": "法规名称",
        "content": "内容摘要",
        "issuingOrgan": "发布机关",
        "timeliness": "时效性",
        "score": 0.85,
        "releaseDate": "发布日期"
      }
    ],
    "total": 10
  }
}
```

### 详情响应

json

复制

```
{
  "success": true,
  "data": {
    "lawName": "法规名称",
    "content": "完整内容",
    "issuingOrgan": "发布机关",
    "timeliness": "时效性",
    "releaseDate": "发布日期"
  }
}
```

## 🔄 更新日志

### v1.0.0 (2024-12-02)

- 

  ✅ 基础搜索功能实现

- 

  ✅ 法规详情页面

- 

  ✅ API认证集成

- 

  ✅ 响应式UI设计

- 

  ✅ 错误处理机制

### 待实现功能

- 

  🔄 搜索历史记录

- 

  🔄 收藏夹功能

- 

  🔄 高级筛选界面

- 

  🔄 用户个性化设置

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目：

1. 

   Fork本项目

2. 

   创建功能分支 (`git checkout -b feature/AmazingFeature`)

3. 

   提交更改 (`git commit -m 'Add some AmazingFeature'`)

4. 

   推送到分支 (`git push origin feature/AmazingFeature`)

5. 

   开启Pull Request

## 📄 许可证

本项目基于MIT许可证开源，详见LICENSE文件。

## 📞 技术支持

- 

  **文档**：查看本项目Wiki页面

- 

  **Issue**：提交问题和建议

- 

  **邮箱**：技术支持邮箱地址

- 

  **法律之星API文档**：参考官方API文档

## 🙏 致谢

感谢以下服务和技术：

- 

  **法律之星** - 提供专业的法律数据库API

- 

  **微信小程序** - 移动端开发平台

- 

  **开源社区** - 各种开源工具和库

------

**注意**：本项目仅用于技术演示和学习目的，实际生产环境使用请确保遵守相关API的使用条款和法律法规。
