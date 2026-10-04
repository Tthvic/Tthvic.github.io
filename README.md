# Jiasen Li 的个人学术主页

这是一个可以部署到 GitHub Pages 的静态网站。采用英文排版，包含个人介绍、论文展示和按年份整理的完整论文页，Scholar 和邮箱入口放在简介下方。

网站通过 GitHub Actions 发布到 [tthvic.github.io](https://tthvic.github.io/)。[源代码仓库](https://github.com/Tthvic/Tthvic.github.io)保留资料、原图和模板，也可以先用本地预览检查修改效果。

## 本地浏览

在项目目录中运行：

```sh
npm run dev
```

然后打开 http://127.0.0.1:4173/ 。修改内容、样式或图片后，预览会自动更新。运行环境为 Node.js 20 或更高版本，无需安装第三方依赖。

Windows 也可以右键 `preview.ps1`，选择“使用 PowerShell 运行”。关闭预览进程会停止本地服务，下次重新运行即可。

## 后期如何维护

| 要更新的内容 | 修改位置 |
| --- | --- |
| 姓名、单位、简介、邮箱、Scholar | `content/profile.json` |
| 新增或更新论文、作者、年份、会议和链接 | `content/publications.json` |
| 论文配图 | `assets/papers/` |
| 字体、颜色、间距和手机排版 | `src/styles.css` |

新增论文时，复制一条论文记录并填写标题、作者、会议、年份、链接和配图路径即可。`selected: true` 表示在首页 Publications 中展示，所有记录都会进入完整论文页。年份自动倒序，同一年由 `order` 决定顺序。

论文作者按资料中的顺序展示。姓名与 `profile.json` 中的 `authorNames` 匹配时自动加粗。共同贡献作者设置 `equal: true`，通讯作者设置 `corresponding: true`。请根据论文原文填写这些字段。

所有论文入口统一显示为 **Paper**。有代码时填写 `code`，页面会增加 **Code** 链接。

配图按原始比例完整显示，边框贴合图片，鼠标悬停时会轻微放大。建议选择论文的整体框架或主要效果图，并提供简短的英文 `imageAlt`。图标随链接自动生成，无需为新论文另外添加。

每次修改某条资料时，同步填写该条的 `updatedAt`，格式为 `YYYY-MM-DD`。页脚使用全部资料中最新的日期，不会随访问日期变化。

## GitHub Pages

```sh
npm run build
```

生成的 `dist/` 可以直接作为 GitHub Pages 发布内容。首页和 `publications/` 都是独立 HTML，使用相对路径，兼容个人域名、`username.github.io` 和仓库子路径。

已经准备好 `.github/workflows/deploy-pages.yml`，提交到 `main` 后会自动构建并发布 `dist/`，无需手动复制生成文件，也不需要额外填写 Token。

已配置的发布方式：

- 仓库：**Tthvic/Tthvic.github.io**，源文件保存在 `main` 分支。
- **Settings → Pages → Build and deployment → Source** 使用 **GitHub Actions**。
- 在 **Actions → Deploy GitHub Pages** 中查看每次发布进度；也可选择 **Run workflow** 手动重新发布。
- 发布成功后的主页地址为 **https://tthvic.github.io/**，完整论文页为 **https://tthvic.github.io/publications/**。

后续只需更新资料或配图，再提交到 `main`。工作流会校验论文配图、重新生成页面并发布。页尾日期仍由资料中的 `updatedAt` 控制。`dist/` 是自动生成的文件夹，已从 Git 提交中排除。

配置依据：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

不要直接修改 `dist/` 内的 HTML；这些文件会从资料和模板重新生成。请修改 `content/`、`src/` 和 `assets/`。

## 项目结构

```text
content/          个人资料和论文记录
assets/papers/    论文原图
src/              共用样式和页面模板
scripts/          本地预览与静态页面生成
dist/             可直接部署的静态网站
.sites-runtime/   本地预览运行信息，不提交到 Git
```
