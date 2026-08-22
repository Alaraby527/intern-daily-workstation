import type { BusinessLine } from '@shared/api.interface';

export const BUSINESS_LINES: Record<string, BusinessLine> = {
  A: {
    code: 'A',
    name: '触达与邀约',
    shortName: 'A 线',
    description: '外部创作者触达与优秀创作者邀约',
    northStar: ['周新注册数', '发布≥1条内容的新创作者数'],
    dailyDeliverables: [
      '触达记录表新增3条（2条常规触达+1条重点邀约），每条含渠道、昵称、话术、结果',
      '访谈记录表1条（有访谈时，含摘要、关键发现、后续动作）',
      '每日打卡记录（填目标、完成量、交付物）',
    ],
    weeklyDeliverables: [
      '周五周复盘：算触达→回复→注册→发布转化率，写2句话结论（下周继续/停止/改什么）',
    ],
    sopLink: 'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN_A',
    completionDefinition:
      '数量达标不算完成，每周复盘一次转化率并调整话术或渠道；周会过数，验收人为带教',
    color: 'line-a',
  },
  B: {
    code: 'B',
    name: '官方账号',
    shortName: 'B 线',
    description: '各平台官方账号运营与内容分发',
    northStar: ['各平台进站流量', '关注数'],
    dailyDeliverables: [
      '内容分发清单记录（含内容编号、平台、发布链接）',
      '当日各平台数据（发文数、曝光/阅读、点赞、收藏、评论、新增关注）',
      '每日打卡记录',
    ],
    weeklyDeliverables: [
      '周一计划会（本周计划表）',
      '周三周中校准',
      '每周数据截图归档',
    ],
    sopLink: 'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN_B',
    completionDefinition:
      '发布频率达标+周数据环比有解释（涨跌说得出原因）；公众号认证通过前先建内容库存，不空等',
    color: 'line-b',
  },
  C: {
    code: 'C',
    name: '社群与爆款',
    shortName: 'C 线',
    description: '社群运营与爆款内容挖掘分发',
    northStar: ['群活跃度', '内容复制率'],
    dailyDeliverables: [
      '爆款候选池记录（新增素材+测试评分和效果评价）',
      '社群反馈表记录（用户反馈、bug转E线）',
      '内容分发清单1条（分发到外部平台的内容链接）',
      '群内爆款分享1条（按模板）',
      '每日打卡记录',
    ],
    weeklyDeliverables: [
      '周一定本周社群计划',
      '周五追踪复制率（写2句话：下周多选什么、少选什么）',
    ],
    sopLink: 'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN_C',
    completionDefinition:
      '爆款分享后追踪复制率，连续低于均值的选品标准要在周会修正；兼任发布质量事后抽查',
    color: 'line-c',
  },
  D: {
    code: 'D',
    name: '供给线',
    shortName: 'D 线',
    description: 'Prompt、Skill、测评帖内容供给',
    northStar: ['分题材内容数', '内容被使用数'],
    dailyDeliverables: [
      '选题排产表更新（发布状态改为"已发布"+发布链接+使用数据）',
      '5个prompt发布链接（人投3个+机投筛选，每个都经过测试）',
      '1个skill发布链接（2个测试用例通过）',
      '1篇测评帖发布链接',
      '选题排产表新增≥2个选题（含来源、优先级）',
      '每日打卡记录',
    ],
    weeklyDeliverables: [
      '周五周复盘：按题材统计内容数和被使用数，找出多发没人用的题材（降权）和用的人多供给少的题材（加排产）',
    ],
    sopLink: 'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN_D',
    completionDefinition:
      '内容上线且有被使用记录；只发布无使用的题材两周后降权；周会看分题材内容数与被使用数',
    color: 'line-d',
  },
  E: {
    code: 'E',
    name: '情报与产品',
    shortName: 'E 线',
    description: '竞品分析、bug收集与功能提案',
    northStar: ['转化为开发的提案数', '修复数'],
    dailyDeliverables: [
      'bug台账记录（每个bug含复现步骤和严重程度）',
      '功能提案记录（每份含影响谁、建议怎么做、预期效果）',
      '竞品分析文档2篇/周',
      '每日打卡记录',
    ],
    weeklyDeliverables: [
      '周一：竞品分析上半周',
      '周二：写1份小功能提案',
      '周三：竞品分析下半周',
      '周四：再写1份小功能提案',
      '周五：跟进闭环',
    ],
    sopLink: 'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN_E',
    completionDefinition:
      '提案进入开发排期或被明确否决都算闭环；只写不转化不算；验收人为产品/工程侧（带教）',
    color: 'line-e',
  },
};

export const getLineByCode = (code: string): BusinessLine | undefined =>
  BUSINESS_LINES[code];
