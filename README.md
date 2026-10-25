# PromptSmith 提示词工坊

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件，在输入框里帮你写提示词：

- **✨ 一键润色**：输入框工具栏多了一个闪光按钮，点一下，结合当前对话上下文把草稿改写得更清晰、具体。会补全「那个」「上面的」这类指代，只改写、不作答。润色后按钮变成撤销，在你修改草稿前随时可以恢复原文。
- **💡 预测下一句**：每轮回答结束后，输入框里会用灰字显示你接下来可能想说的话，按 <kbd>Tab</kbd> 采用。

润色时按钮像被锤子敲打、完成时火星四溅；等待预测时有一串小钢琴键在弹。系统开启「减弱动态效果」时动画会自动关闭。

两个功能都使用当前会话正在用的模型，请求不会写入会话记录。

## 安装

**插件市场**：在 DSH 的 **插件 → 发现** 里添加索引源 `https://suj1e.github.io/seek-bazaar/index.json`，找到 PromptSmith 安装。

**命令行**：

```bash
dsh plugin --profile <profile> add dsh-promptsmith
```

需要 DSH ≥ 0.2.1-rc.3。

## 配置

在 profile 的 `cordis.patch.yml` 里覆盖 `promptsmith` 这一行的 `config`（所有字段可选）：

```yaml
- id: promptsmith
  config:
    contextMessages: 12      # 带给模型的最近消息条数
    maxContextChars: 12000   # 上下文总字符上限
    maxTokens: 1024          # 输出 token 上限
    timeoutMs: 60000         # 单次请求超时
    provider: deepseek       # 固定用某个模型，与 model 同时填；不填则用会话当前模型
    model: deepseek-chat
```

## 开发

见 [AGENTS.md](AGENTS.md)。

## 许可

[MIT](LICENSE)
