# Elliott Photo

个人摄影作品网站，纯静态架构，部署于 Cloudflare Pages。支持按地点、月份、作者筛选照片，拥有摄影集、他人作品和札记等功能。

## 技术栈

- 纯 HTML + CSS + 原生 JavaScript（无框架、无构建工具）
- 衬线字体：macOS 使用系统 `Songti SC`，其他平台加载自托管 `Noto Serif SC`（WOFF2 子集，~4.1MB）
- 深色主题，CSS 自定义属性管理配色
- 响应式断点：≤1100px（双列）、≤880px（单列）

## 目录结构

```
├── index.html                     # 首页 "Still Alive" + 建站感言
├── photo/
│   ├── index.html                 # Photo 入口（三卡片 + 名言轮换）
│   ├── all/index.html             # 全部照片（筛选页）
│   ├── others/index.html          # 他人作品（带作者筛选）
│   └── collections/
│       ├── index.html             # 摄影集列表（卡片形式）
│       └── yangxian_city.html     # 示例：洋县县城合集子页面
├── assets/
│   ├── styles.css                 # 全局样式
│   ├── header.js                  # 共享顶栏（IIFE）
│   ├── lightbox.js                # 点击图片放大光箱
│   ├── exif-reader.js             # 自定义 JPEG EXIF 解析器
│   ├── photo-data.js              # 照片元数据（核心数据文件）
│   ├── photo-all.js               # 全部照片筛选/渲染逻辑
│   ├── photo-others.js            # 他人作品筛选/渲染逻辑
│   ├── photo-collections.js       # 摄影集卡片生成 + 背景轮换
│   ├── font/
│   │   └── noto-serif-sc.woff2    # 中文字体文件
│   ├── photo/
│   │   ├── thumbs/mine/           # 个人照片 WebP 缩略图
│   │   ├── thumbs/others/         # 他人作品 WebP 缩略图
│   │   ├── collections/           # 影集原始 JPG（已 gitignore）
│   │   └── others/                # 他人作品原始 JPG（已 gitignore）
│   ├── pages/
│   │   └── 建站感言.txt           # 首页展开的文章
│   └── scripts/
│       └── build-photo-data.py    # 从 ~/Pictures 目录自动构建数据
```

## 照片数据格式

所有照片元数据定义在 `assets/photo-data.js` 的 `window.PHOTO_ITEMS` 数组中：

```js
{
  id: "2026-05-04-yx-20260504-dsc06455",      // 唯一标识
  title: "",                                    // 标题（空字符串则不显示）
  image: "/assets/photo/thumbs/mine/xxx.webp",  // WebP 缩略图
  month: "2026-05",                             // YYYY-MM 格式
  date: "2026-05-04",                           // YYYY-MM-DD 格式
  collection: "",                               // 所属影集名，空则不属于任何影集
  author: "",                                   // 作者名，有值则为他人作品
  note: "",                                     // 札记内容（可选），有则卡片显示"札记"按钮
  location: {                                   // 四级地点
    country: "中国",
    province: "陕西省",
    city: "汉中市",
    district: "洋县",
  },
  fallbackMeta: {                               // EXIF 元数据
    camera: "SONY SLT-A57",
    aperture: "f/5.6",
    shutter: "1/250s",
    iso: "ISO 100",
    focalLength: "50mm",
  }
}
```

### 照片分类规则

- **全部照片（个人）**：`author` 字段为空或不存在的照片
- **他人作品**：`author` 非空（如 `"夏の歌"`）
- **摄影集**：`collection` 非空（如 `"洋县县城"`）

`photo-all.js` 第 2 行和 `photo-others.js` 第 3 行分别通过 `!p.author` 和 `!!p.author` 过滤。

## 筛选系统

### 地点筛选（级联）

地点按国家 → 省份 → 城市 → 区县四级级联。只显示数据中实际存在的地点层级。
选中上级才会出现对应的下级选项。初始状态所有层级选项为"不限"。

- 单选项（如"中国"）自动选中
- 单选项所在层级以下的级联自动展开
- 他人作品中所有四级必现，单选项自动选中并级联

### 其他筛选

| 筛选器 | 功能 | 实现位置 |
|--------|------|----------|
| 按时间 | 按 YYYY-MM 筛选 | `photo-all.js:141` |
| 按时序 | 最新/最旧排序，默认最新 | `photo-all.js:174` |
| 按作者 | 仅他人作品页有 | `photo-others.js` |

所有筛选之间为交集（AND），即同时满足所有条件才显示。

## 摄影集

### 添加影集

1. 在 `photo-data.js` 中将相关照片的 `collection` 设为影集名（如 `"洋县县城"`）
2. 创建子页面 `photo/collections/xxx.html`（参考 `yangxian_city.html`）
3. 在 `photo-collections.js` 的 `PAGE_MAP` 和 `EN_MAP` 中添加映射

### 页面结构

- `/photo/collections/`：卡片形式展示所有影集，每张卡片有动态背景（从该影集照片中随机切换）
- `/photo/collections/xxx.html`：独立页面，大标题 + 小字描述 + 照片网格，无筛选

## 札记功能

在 `photo-data.js` 中给某张照片添加 `note` 字段后，照片卡片的地名行右侧会出现"札记"字样。点击展开/收起描述内容。

显示逻辑：`photo-all.js:203`、`photo-others.js:224` 检查 `photo.note` 是否存在。

## EXIF 与图片处理

### 自动读取

`exif-reader.js` 通过浏览器 `fetch` 图片二进制，扫描 JPEG APP1 标记，解析 TIFF/IFD 结构获取拍摄参数。

### 回退数据

如果 EXIF 缺失（如被压缩工具删除），使用 `photo-data.js` 中的 `fallbackMeta` 字段。

### WebP 缩略图

缩略图统一生成 WebP（质量 92，长边最大 1600px）。存放在 `assets/photo/thumbs/` 下，按来源分 `mine/` 和 `others/`。

## 顶栏导航

`header.js` 根据 `location.pathname` 自动判断当前所在区域（首页 / Photo 区），高亮对应导航项。

## 光箱

点击任何照片卡片上的**图片本身**（非文字区域）触发全屏查看。支持 Esc / 点击背景 / × 按钮关闭。`lightbox.js` 第 47 行限制触发目标为 `IMG` 标签。

## 首页功能

- 随机名言轮换（8 句，来自 `photo/index.html` 第 59-68 行）
- "建站感言"：点击展开，内容从 `assets/pages/建站感言.txt` 异步加载
- 字体内嵌 `Noto Serif SC` WOFF2，`@font-face` 定义在 `styles.css` 开头

## Photo 入口页卡片背景

三个卡片（全部照片、摄影集、他人作品）使用 `<img class="tile-bg-img">` 承接动态背景：

- **全部照片**：从个人照片池随机切换，6 秒一次
- **摄影集**：从有 `collection` 的照片池随机切换
- **他人作品**：仅设为一张静态背景（当前仅 3 张）
- 切换逻辑在 `photo/index.html` 第 74-113 行

## CSS 设计系统

```css
:root {
  --bg: #040404;         /* 底色 */
  --ink: #f6f1e8;        /* 标题用色 */
  --text: #ebe8e2;       /* 正文 */
  --muted: #aaa39a;      /* 次级文字 */
  --dim: #756f68;        /* 最淡文字 */
  --line: rgba(246, 241, 232, 0.16);
  --line-soft: rgba(246, 241, 232, 0.08);
  --panel: rgba(246, 241, 232, 0.045);
  --serif: "Songti SC", "Noto Serif SC", ...;
  --sans: -apple-system, BlinkMacSystemFont, ...;
}
```

所有卡片使用 `aspect-ratio: 3/4`，`::after` 伪元素提供渐变遮罩，`::before` 用于静态背景（已禁用以 JS 动态 img 替代）。

## 部署

Cloudflare Pages，连接 GitHub 仓库自动部署。部署域名：`elliott-cyg.pages.dev`。

### 版本更新

所有 CSS/JS 引用带 `?v=N` 版本参数以破缓存。修改资源后需递增版本号，更新所有 HTML 中的引用。

## 添加新照片的步骤

1. 将 JPG 放入对应文件夹（个人：`assets/photo/`，他人：`assets/photo/others/<作者名>/`）
2. 生成 WebP 缩略图放入 `assets/photo/thumbs/mine/` 或 `thumbs/others/`
3. 在 `photo-data.js` 中添加条目，按日期降序插入（最新排最前）
4. 如为他人作品，填写 `author` 字段
5. 如属某个影集，填写 `collection` 字段
6. 递增 HTML 中的版本号 `?v=N`
