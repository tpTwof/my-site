const experiment = {
  "record": {
    "id": "5ab84bf555429916710eb01f",
    "method": "react",
    "simulation": false,
    "prediction": "1462",
    "trace": [
      {
        "step": 1,
        "action": {
          "thought": "I need to find out which chain bought Euromarché in 1991. The candidate list includes Euromarché, so I should search for information about Euromarché and its acquisition.",
          "tool": "Search",
          "query": "Euromarché 1991 bought by"
        },
        "observation": "E1: 标题：Euromarché\nEuromarché (\"Euromarket\") was a French hypermarket chain.\n The first store opened in 1968 in Saint-Michel-sur-Orge.\n In June 1991, the group was rebought by its rival, Carrefour, for 5,2 billion francs."
      },
      {
        "step": 2,
        "action": {
          "thought": "E1 shows Euromarché was bought by Carrefour in 1991. Now I need to find how many hypermarkets Carrefour operated at the end of 2016.",
          "tool": "Search",
          "query": "Carrefour hypermarkets 2016"
        },
        "observation": "E2: 标题：Carrefour\nCarrefour S.A. (] ) is a French multinational retailer headquartered in Boulogne Billancourt, France, in the Hauts-de-Seine Department near Paris.\n It is one of the largest hypermarket chains in the world (with 1,462 hypermarkets at the end of 2016).\n Carrefour operates in more than 30 countries, in Europe, the Americas, Asia and Africa.\n Carrefour means \"crossroads\" and \"public square\" in French.\n The company is a component of the Euro Stoxx 50 stock market index."
      },
      {
        "step": 3,
        "action": {
          "thought": "E2 provides the exact number - Carrefour operated 1,462 hypermarkets at the end of 2016. This directly answers the question about how many hypermarkets the chain that bought Euromarché in 1991 operated at the end of 2016.",
          "tool": "Finish",
          "answer": "1462"
        },
        "observation": "任务结束"
      }
    ],
    "stop": "finish",
    "status": "ok",
    "score": 1,
    "stats": {
      "requests": 3,
      "input_tokens": 1472,
      "output_tokens": 497,
      "usage_missing": 0,
      "seconds": 9.344740900021861
    }
  },
  "calls": [
    {
      "question_id": "5ab84bf555429916710eb01f",
      "method": "react",
      "request_id": 12,
      "stage": "attempt-1-action-1",
      "backend": "api",
      "simulation": false,
      "model": "MiniMax-M2.5",
      "attempt": 1,
      "temperature": 0.0,
      "max_tokens": 2000,
      "messages": [
        {
          "role": "user",
          "content": "你在固定本地资料中解答问题。每次只返回一个JSON对象，不输出代码块或其他文本。\n先用 thought 字段写一句可核查的行动理由（指出现有观察或需要得到的证据），再选择一个动作。\n可用动作：{\"thought\":\"行动理由\",\"tool\":\"Search\",\"query\":\"检索词\"}；\n{\"thought\":\"行动理由\",\"tool\":\"Lookup\",\"query\":\"关键词\",\"source\":\"E1\"}；\n{\"thought\":\"依据的观察\",\"tool\":\"Finish\",\"answer\":\"最简英文答案\"}。\nSearch返回候选资料中一个条目的前5句，最多1500字符。\nLookup仅在此前某条证据中按关键词找句子，最多3句。\n新证据依次标记E1、E2等。Finish结束任务。只依据返回的证据，不能自行编造观察。\n检索优先使用简短的英文候选标题。遇到无关或重复的检索结果，改变下一步的检索目标。\n最多6步，至少保留最后一步提交答案。\n\n问题：In 1991 Euromarché was bought by a chain that operated how any hypermarkets at the end of 2016?\n候选标题：[\"Selver\", \"Holiday Inn Lake Buena Vista Downtown\", \"Tesco Extra\", \"Tazweed Center\", \"Carrefour\", \"John A. Brown (department store)\", \"SavaCentre\", \"Uno-X\", \"Euromarché\", \"Lewis's\"]\n当前第 1/6 步。"
        }
      ],
      "temperature_sent": true,
      "response_model": "MiniMax-M2.5",
      "response_id": "chatcmpl-a22e12b0-a393-9e45-bb0c-dec67c2af9e0",
      "finish_reason": "stop",
      "text": "{\"thought\":\"I need to find out which chain bought Euromarché in 1991. The candidate list includes Euromarché, so I should search for information about Euromarché and its acquisition.\",\"tool\":\"Search\",\"query\":\"Euromarché 1991 bought by\"}",
      "usage": {
        "prompt_tokens": 323,
        "total_tokens": 535,
        "completion_tokens": 212,
        "prompt_tokens_details": {
          "cached_tokens": 0
        },
        "completion_tokens_details": {
          "reasoning_tokens": 147
        }
      },
      "seconds": 3.8226323000126285,
      "error": null
    },
    {
      "question_id": "5ab84bf555429916710eb01f",
      "method": "react",
      "request_id": 13,
      "stage": "attempt-1-action-2",
      "backend": "api",
      "simulation": false,
      "model": "MiniMax-M2.5",
      "attempt": 1,
      "temperature": 0.0,
      "max_tokens": 2000,
      "messages": [
        {
          "role": "user",
          "content": "你在固定本地资料中解答问题。每次只返回一个JSON对象，不输出代码块或其他文本。\n先用 thought 字段写一句可核查的行动理由（指出现有观察或需要得到的证据），再选择一个动作。\n可用动作：{\"thought\":\"行动理由\",\"tool\":\"Search\",\"query\":\"检索词\"}；\n{\"thought\":\"行动理由\",\"tool\":\"Lookup\",\"query\":\"关键词\",\"source\":\"E1\"}；\n{\"thought\":\"依据的观察\",\"tool\":\"Finish\",\"answer\":\"最简英文答案\"}。\nSearch返回候选资料中一个条目的前5句，最多1500字符。\nLookup仅在此前某条证据中按关键词找句子，最多3句。\n新证据依次标记E1、E2等。Finish结束任务。只依据返回的证据，不能自行编造观察。\n检索优先使用简短的英文候选标题。遇到无关或重复的检索结果，改变下一步的检索目标。\n最多6步，至少保留最后一步提交答案。\n\n问题：In 1991 Euromarché was bought by a chain that operated how any hypermarkets at the end of 2016?\n候选标题：[\"Selver\", \"Holiday Inn Lake Buena Vista Downtown\", \"Tesco Extra\", \"Tazweed Center\", \"Carrefour\", \"John A. Brown (department store)\", \"SavaCentre\", \"Uno-X\", \"Euromarché\", \"Lewis's\"]\n当前第 1/6 步。"
        },
        {
          "role": "assistant",
          "content": "{\"thought\":\"I need to find out which chain bought Euromarché in 1991. The candidate list includes Euromarché, so I should search for information about Euromarché and its acquisition.\",\"tool\":\"Search\",\"query\":\"Euromarché 1991 bought by\"}"
        },
        {
          "role": "user",
          "content": "工具观察：E1: 标题：Euromarché\nEuromarché (\"Euromarket\") was a French hypermarket chain.\n The first store opened in 1968 in Saint-Michel-sur-Orge.\n In June 1991, the group was rebought by its rival, Carrefour, for 5,2 billion francs.\n当前第 2/6 步。请给出下一个JSON动作。"
        }
      ],
      "temperature_sent": true,
      "response_model": "MiniMax-M2.5",
      "response_id": "chatcmpl-0e0d5466-72a7-9a71-bd15-3e37a6515458",
      "finish_reason": "stop",
      "text": "{\"thought\":\"E1 shows Euromarché was bought by Carrefour in 1991. Now I need to find how many hypermarkets Carrefour operated at the end of 2016.\",\"tool\":\"Search\",\"query\":\"Carrefour hypermarkets 2016\"}",
      "usage": {
        "prompt_tokens": 477,
        "total_tokens": 587,
        "completion_tokens": 110,
        "prompt_tokens_details": {
          "cached_tokens": 256
        },
        "completion_tokens_details": {
          "reasoning_tokens": 53
        }
      },
      "seconds": 2.63883560000977,
      "error": null
    },
    {
      "question_id": "5ab84bf555429916710eb01f",
      "method": "react",
      "request_id": 14,
      "stage": "attempt-1-action-3",
      "backend": "api",
      "simulation": false,
      "model": "MiniMax-M2.5",
      "attempt": 1,
      "temperature": 0.0,
      "max_tokens": 2000,
      "messages": [
        {
          "role": "user",
          "content": "你在固定本地资料中解答问题。每次只返回一个JSON对象，不输出代码块或其他文本。\n先用 thought 字段写一句可核查的行动理由（指出现有观察或需要得到的证据），再选择一个动作。\n可用动作：{\"thought\":\"行动理由\",\"tool\":\"Search\",\"query\":\"检索词\"}；\n{\"thought\":\"行动理由\",\"tool\":\"Lookup\",\"query\":\"关键词\",\"source\":\"E1\"}；\n{\"thought\":\"依据的观察\",\"tool\":\"Finish\",\"answer\":\"最简英文答案\"}。\nSearch返回候选资料中一个条目的前5句，最多1500字符。\nLookup仅在此前某条证据中按关键词找句子，最多3句。\n新证据依次标记E1、E2等。Finish结束任务。只依据返回的证据，不能自行编造观察。\n检索优先使用简短的英文候选标题。遇到无关或重复的检索结果，改变下一步的检索目标。\n最多6步，至少保留最后一步提交答案。\n\n问题：In 1991 Euromarché was bought by a chain that operated how any hypermarkets at the end of 2016?\n候选标题：[\"Selver\", \"Holiday Inn Lake Buena Vista Downtown\", \"Tesco Extra\", \"Tazweed Center\", \"Carrefour\", \"John A. Brown (department store)\", \"SavaCentre\", \"Uno-X\", \"Euromarché\", \"Lewis's\"]\n当前第 1/6 步。"
        },
        {
          "role": "assistant",
          "content": "{\"thought\":\"I need to find out which chain bought Euromarché in 1991. The candidate list includes Euromarché, so I should search for information about Euromarché and its acquisition.\",\"tool\":\"Search\",\"query\":\"Euromarché 1991 bought by\"}"
        },
        {
          "role": "user",
          "content": "工具观察：E1: 标题：Euromarché\nEuromarché (\"Euromarket\") was a French hypermarket chain.\n The first store opened in 1968 in Saint-Michel-sur-Orge.\n In June 1991, the group was rebought by its rival, Carrefour, for 5,2 billion francs.\n当前第 2/6 步。请给出下一个JSON动作。"
        },
        {
          "role": "assistant",
          "content": "{\"thought\":\"E1 shows Euromarché was bought by Carrefour in 1991. Now I need to find how many hypermarkets Carrefour operated at the end of 2016.\",\"tool\":\"Search\",\"query\":\"Carrefour hypermarkets 2016\"}"
        },
        {
          "role": "user",
          "content": "工具观察：E2: 标题：Carrefour\nCarrefour S.A. (] ) is a French multinational retailer headquartered in Boulogne Billancourt, France, in the Hauts-de-Seine Department near Paris.\n It is one of the largest hypermarket chains in the world (with 1,462 hypermarkets at the end of 2016).\n Carrefour operates in more than 30 countries, in Europe, the Americas, Asia and Africa.\n Carrefour means \"crossroads\" and \"public square\" in French.\n The company is a component of the Euro Stoxx 50 stock market index.\n当前第 3/6 步。请给出下一个JSON动作。"
        }
      ],
      "temperature_sent": true,
      "response_model": "MiniMax-M2.5",
      "response_id": "chatcmpl-ceccb560-fc31-921f-8980-fbc6cfba4c97",
      "finish_reason": "stop",
      "text": "{\"thought\":\"E2 provides the exact number - Carrefour operated 1,462 hypermarkets at the end of 2016. This directly answers the question about how many hypermarkets the chain that bought Euromarché in 1991 operated at the end of 2016.\",\"tool\":\"Finish\",\"answer\":\"1462\"}",
      "usage": {
        "prompt_tokens": 672,
        "total_tokens": 847,
        "completion_tokens": 175,
        "prompt_tokens_details": {
          "cached_tokens": 384
        },
        "completion_tokens_details": {
          "reasoning_tokens": 104
        }
      },
      "seconds": 2.8832729999994626,
      "error": null
    }
  ],
  "source": "def react(q,c,memory='',attempt=1):\n    env=EvidenceTools(q['context'])\n    content=TOOL_PROMPT+'\\n问题：'+q['question']+'\\n候选标题：'+json.dumps(env.titles(),ensure_ascii=False)\n    if memory:content+='\\n此前尝试的反思记忆：'+memory\n    if attempt>1:content+='\\n此前尝试未通过正确性检查；这是重置环境后的新尝试。'\n    max_steps=int(c.config.get('max_react_steps',6))\n    messages=[{'role':'user','content':content+f'\\n当前第 1/{max_steps} 步。'}];trace=[]\n    for step in range(1,max_steps+1):\n        raw=c.call(messages,f'attempt-{attempt}-action-{step}',c.config['temperature_qa'])\n        messages.append({'role':'assistant','content':raw})\n        try:\n            action=parse_react_action(raw)\n            if action.get('tool')=='Finish':\n                trace.append({'step':step,'action':action,'observation':'任务结束'})\n                return {'prediction':action['answer'].strip(),'trace':trace,'stop':'finish'}\n            eid,obs=env.execute(action)\n            text=eid+': '+obs\n        except (ValueError,KeyError,TypeError) as e:\n            action={'invalid_raw':raw};text='Invalid action: '+str(e)\n        trace.append({'step':step,'action':action,'observation':text})\n        if step < max_steps:\n            instruction = ('这是最后一步，请依据已有观察给出最有依据的简短答案，输出 Finish JSON。'\n                           if step + 1 == max_steps else '请给出下一个JSON动作。')\n            messages.append({'role':'user','content':f'工具观察：{text}\\n当前第 {step + 1}/{max_steps} 步。{instruction}'})\n    return {'prediction':None,'trace':trace,'stop':'step_limit'}\n\n"
};
