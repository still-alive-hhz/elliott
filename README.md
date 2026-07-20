# Elliott Photo

这是一个静态摄影网站原型，主要入口是 `/photo/`，全部照片页是 `/photo/all/`。

## 添加照片和标签

1. 把照片放进 `assets/photo/`，例如 `assets/photo/hantai-001.jpg`。
2. 打开 `assets/photo-data.js`。
3. 按下面的格式新增一项：

```js
{
  id: "hantai-001",
  title: "照片标题",
  image: "/assets/photo/hantai-001.jpg",
  city: "汉中市",
  district: "汉台区",
  month: "2026-05",
  date: "2026-05-01",
  collection: "城市"
}
```

筛选规则是交集：地点、时间、时序中同时选择多个条件时，照片必须同时满足这些条件才会显示。每个筛选器里的“无”表示不按这一项筛选。

## 拍摄参数

`/photo/all/` 会自动读取 JPG 照片里的 EXIF 参数，并显示相机、镜头、光圈、快门、ISO 和焦距。上传照片时要尽量保留 EXIF；如果照片被压缩工具或社交软件处理过，这些参数可能会被删除。

如果某张照片没有 EXIF，可以在 `photo-data.js` 里加 `fallbackMeta` 作为备用显示：

```js
fallbackMeta: {
  camera: "Fujifilm X-T5",
  lens: "XF 35mm F1.4 R",
  aperture: "f/2.8",
  shutter: "1/250s",
  iso: "ISO 400",
  focalLength: "35mm"
}
```
