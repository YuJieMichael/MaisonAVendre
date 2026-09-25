# Windows startup / Démarrage Windows / Windows 手动启动

## English

Install the Windows **Node.js LTS** installer from [nodejs.org](https://nodejs.org/en/download), including npm and PATH support. This project requires Node.js 22.18 or newer; 24 LTS is recommended. Reopen PowerShell after installation.

**Visual Studio Code:** extract the ZIP first, then open `Propriete-En-Vente.code-workspace` in [VS Code](https://code.visualstudio.com/). Choose **Terminal → Run Task → 1. Install dependencies**, wait for completion, then **2. Start website**. Later, use only task 2. Open the Local link printed in the terminal. The package contains editable source and tasks; Node.js and downloaded dependencies are installed separately. No tasks run automatically when the workspace opens.

**Debugging:** in Run and Debug, choose **Website / Site web / 网页** and press F5 to start Vite and launch Edge with source debugging. If port 5173 is already running (for example, from Codex), choose **Open running website** instead. Stop the server with Ctrl+C in its terminal. The VS Code task fixes port 5173 with `--strictPort` so Supabase email callbacks stay valid. The workspace makes a standard Windows Node.js installation available in new terminals. Keep `.env.local` in this project folder; do not paste keys into launch settings.

Download and extract **Code → Download ZIP** from [the repository](https://github.com/YuJieMichael/Propriete-En-Vente), or clone it if Git is installed:

```powershell
git clone https://github.com/YuJieMichael/Propriete-En-Vente.git
cd Propriete-En-Vente
```

In the project folder containing `package.json`, run:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the **Local** address printed in the terminal, usually `http://127.0.0.1:5173/`. Add `#demo` to view the example seller dashboard. Keep the terminal open; press **Ctrl+C** to stop. On later visits, run only `npm.cmd run dev` in the same folder. Using `npm.cmd` avoids PowerShell's `npm.ps1` execution-policy issue without changing that policy.

To update a Git checkout that is on `main` with no uncommitted changes, stop the running server, then run:

```powershell
git pull --ff-only origin main
npm.cmd ci
npm.cmd run dev
```

Preserve your own changes before updating. ZIP downloads need to be downloaded again. To preview a production build, run `npm.cmd run build` followed by `npm.cmd run preview` and use its printed address, usually port `4173`.

The homepage and demo work without Supabase. Real accounts, uploads and cloud saving require the [backend setup](backend-setup.md). Copy `.env.example` to `.env.local`, fill in the project URL and public publishable key, complete the database/email setup, then restart. Never commit database passwords or server secrets. Running locally or pushing to GitHub does not deploy the original hosted website.

## Français

Installez **Node.js LTS pour Windows** depuis [nodejs.org](https://nodejs.org/en/download), avec npm et l’ajout au PATH. Le projet exige Node.js 22.18 ou plus récent ; la version 24 LTS est recommandée. Rouvrez PowerShell après l’installation.

**Visual Studio Code :** extrayez d’abord le ZIP, puis ouvrez `Propriete-En-Vente.code-workspace` dans [VS Code](https://code.visualstudio.com/). Choisissez **Terminal → Run Task → 1. Install dependencies**, attendez la fin, puis lancez **2. Start website**. Les fois suivantes, la tâche 2 suffit. Ouvrez le lien Local affiché dans le terminal. L’archive contient le code modifiable et les tâches ; Node.js et les dépendances sont installés séparément. Aucune tâche ne se lance automatiquement à l’ouverture.

**Débogage :** choisissez **Website / Site web / 网页** dans Run and Debug, puis F5 pour démarrer Vite et Edge. Si le port 5173 est déjà utilisé par ce site, choisissez **Open running website**. Ctrl+C dans le terminal arrête le serveur. La tâche fixe le port 5173 avec `--strictPort` pour préserver les retours Supabase. Gardez `.env.local` dans le dossier du projet ; aucune clé n’est nécessaire dans les paramètres du débogueur.

Dans [le dépôt GitHub](https://github.com/YuJieMichael/Propriete-En-Vente), choisissez **Code → Download ZIP** et extrayez l’archive. Si Git est installé, vous pouvez aussi cloner le dépôt :

```powershell
git clone https://github.com/YuJieMichael/Propriete-En-Vente.git
cd Propriete-En-Vente
```

Dans le dossier contenant `package.json`, exécutez :

```powershell
npm.cmd ci
npm.cmd run dev
```

Ouvrez l’adresse **Local** affichée dans le terminal, généralement `http://127.0.0.1:5173/`. Ajoutez `#demo` pour consulter l’espace vendeur d’exemple. Gardez le terminal ouvert et appuyez sur **Ctrl+C** pour arrêter le serveur. Les fois suivantes, seule la commande `npm.cmd run dev` est nécessaire. `npm.cmd` évite le problème de stratégie d’exécution de `npm.ps1` sans modifier cette stratégie.

Pour mettre à jour une copie Git sur `main`, sans modifications locales non enregistrées, arrêtez le serveur puis exécutez :

```powershell
git pull --ff-only origin main
npm.cmd ci
npm.cmd run dev
```

Préservez vos propres modifications avant une mise à jour. Une copie ZIP doit être téléchargée à nouveau. Pour prévisualiser la version de production, exécutez `npm.cmd run build`, puis `npm.cmd run preview` et ouvrez l’adresse affichée, généralement sur le port `4173`.

L’accueil et la démonstration fonctionnent sans Supabase. Les comptes réels, les fichiers et l’enregistrement distant exigent la [configuration du backend](backend-setup.md). Copiez `.env.example` vers `.env.local`, renseignez l’URL du projet et la clé publique publishable, configurez la base et les courriels, puis redémarrez. N’envoyez jamais de mot de passe ou de clé secrète dans GitHub. Le démarrage local et le push GitHub ne publient pas le site hébergé d’origine.

## 中文

### Windows 手动启动 Propriété En Vente

**使用 Visual Studio Code：** 先解压 ZIP，再用 [VS Code](https://code.visualstudio.com/) 打开 `Propriete-En-Vente.code-workspace`。点击 **Terminal（终端）→ Run Task（运行任务）→ 1. Install dependencies（安装依赖）**，完成后运行 **2. Start website（启动网页）**。以后只需运行第 2 个任务，打开终端显示的 Local 地址。源码包不捆绑 Node.js 或 `node_modules`，首次仍需安装 Node.js 并联网下载依赖。打开工作区不会自动执行命令。

**调试：** 左侧 Run and Debug（运行和调试）选择 **Website / Site web / 网页**，按 F5 可启动网站并在 Edge 中调试源码。如果网站已经由 Codex 或其他终端在 5173 端口运行，选择 **Open running website / 调试已启动网页**，避免重复启动。停止服务用终端里的 Ctrl+C。任务固定使用 5173 端口，保证 Supabase 邮件回跳有效；本机 `.env.local` 已配置时直接使用，不需要把密钥填入调试设置。

网站源码在 [YuJieMichael/Propriété En Vente](https://github.com/YuJieMichael/Propriete-En-Vente)。下载源码后，需要启动本地服务，不能直接双击 `index.html`。

### 第一次准备

1. 从 [Node.js 官网](https://nodejs.org/en/download) 安装 Windows 的 **LTS 版本**，保留安装器中的 npm 和 PATH 选项。本项目要求 Node.js 22.18 或以上，推荐 24 LTS。
2. 安装后重新打开 PowerShell，检查：

   ```powershell
   node --version
   npm.cmd --version
   ```

这里使用 `npm.cmd`，可以避免 PowerShell 将 `npm` 解析为受执行策略限制的 `npm.ps1`；不需要修改执行策略。

### 打开源码文件夹

如果电脑上已经有项目，在包含 `package.json` 的 **Propriété En Vente 文件夹**打开 PowerShell。也可以在终端输入 `cd "你的源码文件夹完整路径"`。

如果还没有源码，可以在 GitHub 仓库点 **Code → Download ZIP**，解压后进入包含 `package.json` 的文件夹。有 Git 的电脑也可以运行：

```powershell
git clone https://github.com/YuJieMichael/Propriete-En-Vente.git
cd Propriete-En-Vente
```

### 首次启动

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

### 以后启动与停止

以后只需打开同一个项目文件夹，运行：

```powershell
npm.cmd run dev
```

使用网站时保持终端开启。要停止服务，在终端按 **Ctrl+C**。电脑重启后需要重新启动；之前由 Codex 打开的 `4176` 预览地址不代表手动启动也使用这个端口。

### 更新 GitHub 上已合并的代码

通过 Git 克隆、且当前在 `main` 分支、没有未提交本地修改时，先停止正在运行的开发服务，然后可以运行：

```powershell
git pull --ff-only origin main
npm.cmd ci
npm.cmd run dev
```

如果你已经修改源码或正在其他分支，先保存并处理自己的修改，再更新；不要为了更新而强制覆盖文件。下载 ZIP 的版本没有 Git 历史，需要另行下载新版。

### 预览正式构建

要检查构建后的网页，运行：

```powershell
npm.cmd run build
npm.cmd run preview
```

打开终端显示的地址，通常为 `http://127.0.0.1:4173/`。开发服务和预览服务都只供本机查看；推送 GitHub 也不会自动更新原来的 `chatgpt.site` 网站。

### 真实账号和上传功能

**无需 Supabase 配置即可浏览首页和 `#demo` 示例。** 真实注册、登录、云端保存、文件上传及管理员审核，需要先完成 [Supabase 后端接入](backend-setup.md)。

将 `.env.example` 复制为 `.env.local`，填写项目 URL 和公开 publishable key；数据库迁移、邮件与回跳地址也必须按后端指南配置。修改环境变量后重新启动服务。数据库密码、服务器 secret key 和 service-role key 不放进网页，也不提交 GitHub。
