let currentStep = 0;
const byId = (id) => document.getElementById(id);
const pretty = (value) => JSON.stringify(value, null, 2);
const descriptions = [
  "第一轮只知道问题与候选标题。模型搜索 Euromarché，Python 返回 E1。收购方 Carrefour 出现在真实观察中。",
  "第二轮的消息已包含 E1。模型据此把查询目标改为 Carrefour。Python 返回 E2，其中含 1,462 家。",
  "模型选择 Finish，程序读取 answer，结束循环。这一步没有执行检索工具。“任务结束”是程序写入轨迹的状态。"
];
function renderStep() {
  const step = experiment.record.trace[currentStep];
  byId("progress").textContent = `第 ${currentStep + 1} / 3 步`;
  byId("action").textContent = pretty(step.action);
  byId("observation").textContent = step.observation;
  byId("explanation").textContent = descriptions[currentStep];
  byId("messages").textContent = pretty(experiment.calls[currentStep].messages);
  byId("prev").disabled = currentStep === 0;
  byId("next").disabled = currentStep === 2;
  byId("obs-label").textContent = currentStep === 2 ? "程序终止" : "本地工具返回";
}
byId("prev").addEventListener("click", () => {currentStep--; renderStep();});
byId("next").addEventListener("click", () => {currentStep++; renderStep();});
const structures = {
  messages: ["消息列表由程序维护，发给聊天接口。role 表示消息来源，content 是字符串。本实验用 user 消息传回工具观察。下面展示第二轮真实输入。", experiment.calls[1].messages],
  action: ["动作由模型生成，Python 用 json.loads 解析成 dict。这里展示第一轮真实动作。工具名决定执行哪个函数。", experiment.record.trace[0].action],
  evidence: ["证据字典由 EvidenceTools 保存。键是 E1、E2，值是工具实际返回的字符串。Lookup 的 source 查找这个字典。下面按真实观察重建两条证据。", {E1: experiment.record.trace[0].observation.replace("E1: ", ""), E2: experiment.record.trace[1].observation.replace("E2: ", "")}],
  trace: ["轨迹列表由程序保存，用于查看每一步和评分。step 是步号，action 是解析后的动作，observation 是实际返回结果。", experiment.record.trace]
};
function renderStructure(kind) {
  byId("structure-help").textContent = structures[kind][0];
  byId("structure-code").textContent = pretty(structures[kind][1]);
  document.querySelectorAll("[data-kind]").forEach(button => {
    button.classList.toggle("active", button.dataset.kind === kind);
    button.setAttribute("aria-pressed", String(button.dataset.kind === kind));
  });
}
document.querySelectorAll("[data-kind]").forEach(button => button.addEventListener("click", () => renderStructure(button.dataset.kind)));
byId("real-code").textContent = experiment.source;
renderStep();
renderStructure("messages");
