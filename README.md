# 晴空岛 · Pokopia 小岛日记

一个面向 iOS Safari 的宝可梦风小岛生活网页游戏。玩家扮演人形百变怪，在晴空岛上采集、浇水、种植、建造，并邀请皮卡丘、伊布和妙蛙种子入住。

## 功能

- 等距小岛地图与触屏点击寻路
- 采集、补水、种植、建造和休息循环
- 三项岛上委托与宝可梦入住进度
- 体力、贝壳、等级、背包与舒适度系统
- Safari 本地存档、PWA 清单与安全区适配
- 手机竖屏、横屏与桌面响应式布局
- Three.js 低多边形 3D 场景，带真实光照、阴影和景深
- 内置 Three.js 运行库，无外部图片、字体或 CDN 依赖

## 本地运行

```bash
npm start
```

然后访问 `http://127.0.0.1:4173`。

也可以直接打开 `index.html`，但建议使用本地服务器以获得完整的 PWA 和存储行为。

## GitHub Pages

仓库根目录就是静态站点。首次使用时，需要仓库管理员在 GitHub 的 `Settings > Pages` 中把来源设为 `GitHub Actions`，然后在 Actions 页面手动运行 `Deploy game to GitHub Pages`。

部署地址：

`https://aheidashuaige-coder.github.io/sunny-isle-pokopia/`

部署完成后，可直接在 iPhone 的 Safari 中打开。

## 像素模型样片

保留 3D 地图尺度，并将主角、皮卡丘、伊布和妙蛙种子切换为 GBA 风格的平面像素精灵：

`https://aheidashuaige-coder.github.io/sunny-isle-pokopia/?play=1&pixel=1`

## iPhone Safari 局域网访问

在电脑上运行 `npm start` 后，让 iPhone 与电脑连接同一个 Wi-Fi，在 Safari 中打开：

`http://电脑的局域网 IP:4173/?play=1`

## 说明

这是一个非商业的粉丝向网页游戏原型，与 Nintendo、The Pokémon Company 或 Game Freak 无隶属关系。角色与场景使用程序化 3D 模型绘制，采用《潜水员戴夫》式厚实手绘低多边形方向呈现，不包含游戏原素材。
