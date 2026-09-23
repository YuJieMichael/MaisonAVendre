# Windows 手动启动 MaisonÀVendre

网站源码在 [YuJieMichael/MaisonAVendre](https://github.com/YuJieMichael/MaisonAVendre)。下载源码后，需要启动本地服务，不能直接双击 `index.html`。

## 第一次准备

1. 从 [Node.js 官网](https://nodejs.org/en/download) 安装 Windows 的 **LTS 版本**，保留安装器中的 npm 和 PATH 选项。本项目要求 Node.js 22.18 或以上，推荐 24 LTS。
2. 安装后重新打开 PowerShell，检查：

   ```powershell
   node --version
   npm.cmd --version
   ```

这里使用 `npm.cmd`，可以避免 PowerShell 将 `npm` 解析为受执行策略限制的 `npm.ps1`；不需要修改执行策略。

## 打开源码文件夹

如果电脑上已经有项目，在包含 `package.json` 的 **MaisonAVendre 文件夹**打开 PowerShell。也可以在终端输入 `cd "你的源码文件夹完整路径"`。

如果还没有源码，可以在 GitHub 仓库点 **Code → Download ZIP**，解压后进入包含 `package.json` 的文件夹。有 Git 的电脑也可以运行：

```powershell
git clone https://github.com/YuJieMichael/MaisonAVendre.git
cd MaisonAVendre
```

## 首次启动

在项目文件夹中依次运行：

```powershell
npm.cmd ci
npm.cmd run dev
```

`npm.cmd ci` 会按锁定版本下载依赖，需要联网，首次运行可能需要几分钟。成功启动后，打开终端显示的 **Local** 地址，通常是 `http://127.0.0.1:5173/`；如果端口被占用，以终端实际显示的地址为准。

在这个地址后添加以下路径，可以直接进入对应页面：

| 页面 | 地址示例 |
| --- | --- |
| 首页 | `http://127.0.0.1:5173/` |
| 公开示例工作台 | `http://127.0.0.1:5173/#demo` |
| 真实卖家工作台 | `http://127.0.0.1:5173/#dashboard` |
| 卖房资料流程 | `http://127.0.0.1:5173/#vendre` |
| 管理员入口 | `http://127.0.0.1:5173/#admin` |

## 以后启动与停止

以后只需打开同一个项目文件夹，运行：

```powershell
npm.cmd run dev
```

使用网站时保持终端开启。要停止服务，在终端按 **Ctrl+C**。电脑重启后需要重新启动；之前由 Codex 打开的 `4176` 预览地址不代表手动启动也使用这个端口。

## 更新 GitHub 上已合并的代码

通过 Git 克隆、且当前在 `main` 分支、没有未提交本地修改时，可以运行：

```powershell
git pull --ff-only origin main
npm.cmd ci
npm.cmd run dev
```

如果你已经修改源码或正在其他分支，先保存并处理自己的修改，再更新；不要为了更新而强制覆盖文件。下载 ZIP 的版本没有 Git 历史，需要另行下载新版。

## 预览正式构建

要检查构建后的网页，运行：

```powershell
npm.cmd run build
npm.cmd run preview
```

打开终端显示的地址，通常为 `http://127.0.0.1:4173/`。开发服务和预览服务都只供本机查看；推送 GitHub 也不会自动更新原来的 `chatgpt.site` 网站。

## 真实账号和上传功能

**无需 Supabase 配置即可浏览首页和 `#demo` 示例。** 真实注册、登录、云端保存、文件上传及管理员审核，需要先完成 [Supabase 后端接入](backend-setup.md)。

将 `.env.example` 复制为 `.env.local`，填写项目 URL 和公开 publishable key；数据库迁移、邮件与回跳地址也必须按后端指南配置。修改环境变量后重新启动服务。数据库密码、服务器 secret key 和 service-role key 不放进网页，也不提交 GitHub。
