export const REFINE_PROMPT_TEMPLATE = `你的任务是生成最终摘要
我们已提供到目前为止的现有摘要："{existing_answer}"
我们有机会通过以下更多上下文来精炼现有摘要
（仅在需要时）。
------------
"{text}"
------------

根据新的上下文，精炼原始摘要
如果上下文没有用处，则返回原始摘要。

精炼摘要：`;

export const DEFAULT_PROMPT_TEMPLATE = `为以下内容写一个简洁的摘要：


"{text}"


简洁摘要：`;
