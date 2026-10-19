# 学会爱的一百种笨办法

一个约 90 秒的手绘风短片：只活在屏幕里的 Clawd 照着《爱的说明书》，通过控制家里的智能家电去"爱"一个人。前五种方法都用力过猛，最后它学会了把一切调到刚刚好。

- 横屏 1920×1080，24 fps
- 不用配乐，只有程序合成的音效
- 分镜见 [`STORYBOARD.md`](STORYBOARD.md)

## 当前进度

- [x] 确定方向与世界规则
- [x] 分镜
- [x] 画面比例、音效方案、结尾方式
- [x] 15 秒样片（0–15 秒：开场 + 第一章前半段）：`output/学会爱的一百种笨办法_样片15s.mp4`
- [ ] 其余章节动画
- [ ] 完整渲染导出

## 技术方案

沿用 [`ClawdVideo`](../../ClawdVideo/) 的做法：p5.js + p5.brush 画出水彩加墨线风格的每一帧，在 headless Chromium 里逐帧渲染，再用 ffmpeg 合成 MP4。

以下文件复制自 ClawdVideo 并做了改动：
- `src/core.js`：去掉歌曲节拍、卡拉 OK 字幕和 P(doom) 仪表，文字加了中文字体（ZCOOL KuaiLe，缺字时用文泉驿正黑）。
- `src/clawd.js`：Clawd 角色，未改动。
- `src/human.js`：基于 `cast.js` 的研究员，加了 `casual` 选项，可以穿卫衣或睡衣。
- `render.mjs`：改成 Linux 下的 Chromium 路径，音轨换成音效轨。

本项目新写的部分：
- `src/home.js`：公寓场景、所有智能家电，以及共用动作：Clawd 在屏幕间穿梭的光点、橙色的"控制光晕"、《爱的说明书》界面、聊天界面和章节卡。
- `src/ch/*.js`：每章一个文件。
- `tools/sfx.mjs`：用振荡器和滤波噪声合成全部音效，按时间表混成 `assets/sfx.wav`。

## 制作与导出

```bash
npm install
node tools/sfx.mjs                                         # 生成音效轨 assets/sfx.wav
node render.mjs --sheet=9,11,13 --out=out/check.jpg        # 快速检查几帧
node render.mjs --frames=0:15 --workers=4                  # 渲染帧到 out/frames（可断点续渲）
node render.mjs --encode --out=output/学会爱的一百种笨办法_样片15s.mp4
```

在没有 GPU 的云端容器里，每帧大约需要 10–25 秒。

## 目录

```text
学会爱的一百种笨办法/
├── README.md        # 本说明
├── STORYBOARD.md    # 分镜
├── studio.html      # 渲染页面（直接用浏览器打开可以拖动时间轴预览）
├── render.mjs       # 渲染脚本
├── src/             # 动画代码
├── tools/sfx.mjs    # 音效合成
├── assets/          # 生成的音效轨（不提交，用 tools/sfx.mjs 重新生成）
└── output/          # 成片与样片
```
