# 学会爱的一百种笨办法

一个约 90 秒的手绘风短片：只活在屏幕里的 Clawd 照着《爱的说明书》，通过控制家里的智能家电去"爱"一个人。前五种方法都用力过猛，最后它学会了把一切调到刚刚好。

## 当前进度

- [x] 确定方向与世界规则
- [x] 分镜：见 [`STORYBOARD.md`](STORYBOARD.md)
- [ ] 确定配乐与画面比例
- [ ] 动画制作
- [ ] 渲染导出

## 依赖

计划沿用 [`ClawdVideo`](../../ClawdVideo/) 的技术方案：p5.js + p5.brush 绘制每一帧，用 headless Chrome 逐帧渲染，再用 ffmpeg 编码为 MP4。Clawd 的角色造型参考 `ClawdVideo/src/clawd.js`。

## 目录

```text
学会爱的一百种笨办法/
├── README.md       # 本说明
├── STORYBOARD.md   # 分镜
├── assets/         # 配乐、素材（制作时创建）
├── src/            # 动画代码（制作时创建）
└── output/         # 成片（制作时创建）
```
