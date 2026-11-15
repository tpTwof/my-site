const explanations = {
  origin: {
    title: "首条消息由程序拼出来",
    text: "q 是一道题的字典。英文 question 和候选 context 来自教学数据，TOOL_PROMPT 里的工具说明、格式约束和步数由项目代码提供。首轮模型只接收候选标题，完整正文保存在本地 env.docs。",
    code: 'content = TOOL_PROMPT + "\\n问题：" + q["question"]\ncontent += "\\n候选标题：" + json.dumps(env.titles(), ensure_ascii=False)\nmessages = [{"role": "user", "content": content}]',
    detail: "上面为拼接逻辑摘录。实际代码还附加当前步数。候选原文中的答案属于可检索证据，单独的 gold 文件供评分器使用。",
    related: ["parameters", "environment", "tools"]
  },
  tools: {
    title: "程序提供工具，模型选择动作",
    text: "项目在提示中列出 Search、Lookup、Finish，并用 Python 实现操作。模型读取用法后生成 tool 字段和对应参数。程序校验工具名，再调用相应函数。",
    code: '模型输出的 JSON\n{"thought":"先确定收购方","tool":"Search","query":"Euromarché 1991 bought by"}\n\nPython 解析后得到 action 字典\naction["tool"]   # "Search"\naction["query"]  # "Euromarché 1991 bought by"',
    detail: "工具名不受支持时，程序返回非法动作提示。Search 的查找过程在本地执行，不再调用模型。",
    related: ["execute", "answer", "search"]
  },
  answer: {
    title: "answer 属于 Finish 动作",
    text: "Search 的参数是 query；Lookup 的参数是 query 和 source；Finish 的参数是 answer。三种动作都要求 thought 和 tool。",
    code: '第三步真实动作\n' + pretty(experiment.record.trace[2].action) + '\n\nif action.get("tool") == "Finish":\n    return {"prediction": action["answer"].strip(),\n            "trace": trace, "stop": "finish"}',
    detail: "parse_react_action 在进入这个分支前确认 Finish 具有非空 answer。这里读取到字符串 1462，随后返回到外层评分程序。",
    related: ["tools", "simplified"]
  },
  parameters: {
    title: "react 接收一道题和一个客户端",
    text: "q 是 dict，字段为 id、question、context。c 是 Client 实例，其 config 字典保存模型和运行参数，call 方法负责发请求。memory 是字符串，默认空；attempt 是整数，默认 1。",
    code: 'react(q, c, memory="", attempt=1)\n\nq["id"]       # "5ab84bf555429916710eb01f"\nq["question"] # 英文题目\nq["context"]  # [[标题, [句子1, 句子2, ...]], ...]\n\nc.config["max_react_steps"] # 6\nc.config["temperature_qa"]  # 0.0\nraw = c.call(messages, "attempt-1-action-1", 0.0)',
    detail: "正式 ReAct 使用默认 memory 和 attempt。项目中的 Reflexion 也复用这个函数，用 memory 携带上次反思，attempt 标记重新开始的第几次尝试。step 是当前尝试里的动作步数。",
    related: ["environment", "syntax", "origin"]
  },
  syntax: {
    title: "这一行是写在同行的 if",
    text: "冒号属于 if 语句。memory 是字符串，空字符串在条件判断中为假，非空字符串为真。content += 文本表示把文本追加到 content。",
    code: "原写法\nif memory:content+='\\n此前尝试的反思记忆：'+memory\n\n展开后完全等价\nif memory:\n    content += '\\n此前尝试的反思记忆：' + memory\n\n# memory = '' → 跳过追加\n# memory = '先核对标题' → 把这句话追加到首条提示",
    detail: "if attempt > 1:content += ... 使用相同语法。普通 ReAct 的 attempt 为 1，因此也跳过该分支。",
    related: ["parameters", "origin"]
  },
  environment: {
    title: "env 是保存资料与证据的对象",
    text: "EvidenceTools(q['context']) 调用类的构造函数。它把本题的候选资料保存为 docs，创建空的 evidence 字典和 records 列表。env 指向这个新对象。",
    code: 'env = EvidenceTools(q["context"])\n\n# 刚创建时\nenv.docs      # 本题全部 (标题, 句子列表)\nenv.evidence  # {}\nenv.records   # []\n\n# 第一次 Search 执行后\nenv.evidence["E1"]  # Euromarché 的真实正文片段\nenv.records[0]     # {"id": "E1", "action": {...}, "observation": "..."}',
    detail: "env 的状态在同一题内累积，下一题会新建对象。env.evidence 让 Lookup 按编号取证据，messages 则让模型在下一次请求中读到观察。",
    related: ["execute", "parameters", "search"]
  },
  execute: {
    title: "execute 分发动作并保存结果",
    text: "输入 action 是已校验的 dict。execute 按 tool 选择 search 或 lookup，将返回文本编号并存入证据字典，最后返回一个含两个字符串的元组。Finish 已经在 react 内提前处理。",
    code: 'eid, obs = env.execute(action)\n\n# execute 的主要步骤\nif action["tool"] == "Search":\n    result = self.search(action["query"])\nelif action["tool"] == "Lookup":\n    result = self.lookup(action["query"], action["source"])\n\neid = f"E{len(self.evidence) + 1}"\nself.evidence[eid] = result\nself.records.append({"id": eid, "action": dict(action),\n                     "observation": result})\nreturn eid, result\n\n# 第一步的返回值，由左边两个变量分别接收\neid = "E1"\nobs = ' + JSON.stringify(experiment.record.trace[0].observation.replace("E1: ", "")),
    detail: "上面展示正常动作路径，源码另有类型检查及未知工具处理。react 随后拼出 text = eid + ': ' + obs，保存到 trace，并放进下一轮 messages。",
    related: ["environment", "search", "answer"]
  },
  search: {
    title: "Search 按词项交集打分",
    text: "查询和候选标题、正文都转成小写词项集合。标题匹配一个查询词加 3 分，正文匹配一个加 1 分。得分最高者胜出，同分按标题排序。",
    code: "terms = words(query)\nscore = 3 * len(terms & words(title))\nscore += len(terms & words(' '.join(sentences)))\n\n查询 Euromarché 1991 bought by\n词项 {euromarch, 1991, bought, by}\n\nEuromarché\n  标题命中 euromarch → 3 分\n  正文命中 euromarch、1991、by → 3 分\n  合计 6 分\n\nLewis's\n  正文命中 1991、bought、by → 3 分",
    detail: "words 使用 [a-z0-9]+，é 被截掉，重复词去重。选中条目后返回前 5 句，总长度上限 1,500 字符。Lookup 只读已返回片段。检索未命中也会返回提示文字并分配证据号。",
    related: ["execute", "environment"]
  },
  simplified: {
    title: "solve 是 react 的教学骨架",
    text: "两者都执行“调用模型 → 解析动作 → 执行工具 → 追加观察”的循环。网页 solve 为便于阅读简化了客户端签名和返回结构。实际实验使用下方展开区域里的 react。",
    code: '# 教学 solve\nraw = client.call(messages)\nreturn action["answer"]\n\n# 实际 react\nraw = c.call(messages, stage, c.config["temperature_qa"])\nreturn {"prediction": action["answer"].strip(),\n        "trace": trace, "stop": "finish"}\n\n# 步数耗尽\nreturn {"prediction": None, "trace": trace, "stop": "step_limit"}',
    detail: "实际 react 还保存逐步轨迹、附加反思记忆和步数提示。调用现有 Client 时需要传 messages、stage、temperature 三个参数。",
    related: ["parameters", "execute", "answer"]
  }
};

const helpDialog = byId("help-dialog");
let helpHistory = [];
function showHelp(topic, remember = true) {
  if (remember) helpHistory.push(topic);
  const entry = explanations[topic];
  byId("help-title").textContent = entry.title;
  const body = byId("help-body");
  body.replaceChildren();
  const description = document.createElement("p");
  description.textContent = entry.text;
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = entry.code;
  pre.append(code);
  const detail = document.createElement("p");
  detail.textContent = entry.detail;
  body.append(description, pre, detail);
  const related = byId("help-related");
  related.replaceChildren();
  entry.related.forEach(key => {
    const button = document.createElement("button");
    button.textContent = explanations[key].title + " →";
    button.addEventListener("click", () => showHelp(key));
    related.append(button);
  });
  byId("help-back").disabled = helpHistory.length < 2;
  if (!helpDialog.open) helpDialog.showModal();
  helpDialog.scrollTop = 0;
}
document.querySelectorAll("[data-help]").forEach(button => {
  button.addEventListener("click", () => {
    helpHistory = [];
    showHelp(button.dataset.help);
  });
});
byId("help-close").addEventListener("click", () => helpDialog.close());
byId("help-back").addEventListener("click", () => {
  if (helpHistory.length < 2) return;
  helpHistory.pop();
  showHelp(helpHistory[helpHistory.length - 1], false);
});
