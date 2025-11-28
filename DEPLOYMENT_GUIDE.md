# 🚀 GitHub 部署指南

## 步骤 1：创建 GitHub 仓库

1. 访问 https://github.com/new
2. 登录您的 GitHub 账号
3. 填写仓库信息：
   - **Repository name**: `face-reading-app`
   - **Description**: 人脸分析应用 - Face Reading App
   - **Public** 或 **Private** (推荐 Public 以使用 GitHub Pages)
   - ⚠️ **不要**勾选 "Add a README file"（我们已有 README）
   - ⚠️ **不要**选择 .gitignore 和 license（我们已有）
4. 点击 **"Create repository"** 按钮

## 步骤 2：推送代码到 GitHub

创建仓库后，GitHub 会显示命令。在您的终端（Terminal）中执行：

```bash
cd /Users/lianlian/Desktop/face-reading-app

# 添加远程仓库（请将 YOUR_USERNAME 替换为您的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/face-reading-app.git

# 推送代码
git branch -M main
git push -u origin main
```

## 步骤 3：部署到 GitHub Pages

代码推送成功后，运行部署命令：

```bash
npm run deploy
```

这个命令会：
1. 自动构建生产版本 (`npm run build`)
2. 将构建结果发布到 `gh-pages` 分支
3. 自动部署到 GitHub Pages

## 步骤 4：配置 GitHub Pages（如果需要）

1. 访问仓库的 Settings 页面
2. 在左侧菜单找到 **"Pages"**
3. 确认设置：
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages` / `/(root)`
4. 点击 **"Save"**

## 步骤 5：访问您的应用

部署完成后，应用会在以下地址访问：

```
https://YOUR_USERNAME.github.io/face-reading-app
```

（将 YOUR_USERNAME 替换为您的 GitHub 用户名）

---

## 🔧 重要配置说明

### 修改 homepage（如果 GitHub 用户名不是 lianlian）

编辑 `package.json` 文件，找到：

```json
"homepage": "https://lianlian.github.io/face-reading-app"
```

修改为：

```json
"homepage": "https://YOUR_USERNAME.github.io/face-reading-app"
```

然后重新提交并部署：

```bash
git add package.json
git commit -m "Update homepage URL"
git push
npm run deploy
```

---

## 📋 常用命令

```bash
# 启动开发服务器
npm start

# 构建生产版本
npm run build

# 部署到 GitHub Pages
npm run deploy

# 查看 Git 状态
git status

# 提交更新
git add .
git commit -m "Your commit message"
git push

# 更新并重新部署
git add .
git commit -m "Update application"
git push
npm run deploy
```

---

## 🎯 快速重新部署

当您修改代码后，执行以下命令即可更新线上版本：

```bash
git add .
git commit -m "描述您的修改"
git push
npm run deploy
```

---

## ⚠️ 常见问题

### 1. 部署后页面空白
- 检查 `package.json` 中的 `homepage` 字段是否正确
- 确保使用的是您的 GitHub 用户名

### 2. 404 错误
- 等待 3-5 分钟，GitHub Pages 需要时间部署
- 检查 GitHub Pages 设置中的分支是否为 `gh-pages`

### 3. 推送失败
- 检查远程仓库地址是否正确
- 确保您有推送权限

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看 GitHub Actions 日志（如果有）
2. 检查浏览器控制台错误信息
3. 查看 [GitHub Pages 文档](https://docs.github.com/en/pages)






