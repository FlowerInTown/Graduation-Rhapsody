// 反派 NPC 8 句固定对话
// 顺序：NPC 与玩家交替开口，从 NPC 第一句开始
// speaker: 'npc' = 反派，'me' = 主角
// 总共 8 句（默认 NPC 4 + 主角 4），按数组顺序播放
// TODO: 待填入正式台词
export const BAD_NPC_DIALOG_LINES = [
  { speaker: 'npc', text: '别动，嘿嘿嘿' },
  { speaker: 'me', text: '完蛋了...' },
  { speaker: 'npc', text: '别紧张，交换下小礼物而已' },
  { speaker: 'me', text: '我没什么值钱的东西...' },
  { speaker: 'npc', text: '你的那些破玩意我也用不上，把你飞船能量给我一半如何' },
  { speaker: 'me', text: '...可是我还要回家...' },
  { speaker: 'npc', text: '少废话，想活命就快点！' },
  { speaker: 'me', text: '好...好吧...' },
];

// 8 句对话播完后，系统弹框提示文本
export const BAD_NPC_ENERGY_STEAL_MESSAGE = '你的飞船能量被抢走了一半！';

// NPC 滑出后，主角自言自语的气泡
export const BAD_NPC_AFTER_LEAVE_PLAYER_LINE = '终于走了……';
