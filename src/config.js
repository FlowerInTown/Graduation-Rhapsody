// ============================================================
// 游戏数值配置文件 —— 所有需要经常调整的数值都集中在这里
// ============================================================

// ----- 画布 / 分辨率 -----
export const W = 1280;
export const H = 720;

// ----- 场景过渡 -----
export const TRANSITION_FADE_DURATION = 0.5;  // 场景过渡淡入淡出时长(秒)
export const ENDING_TRANSITION_FADE_DURATION = 3.0;  // 结局场景过渡淡入淡出时长(秒)

// ----- 银河系 -----
export const GALAXY_W = 1920;                // 银河系逻辑宽度
export const GALAXY_H = 1080;               // 银河系逻辑高度
export const GALAXY_SYSTEM_COUNT_MIN = 80;   // 星系数量下限
export const GALAXY_SYSTEM_COUNT_MAX = 100;   // 星系数量上限
export const GALAXY_MARGIN = 100;            // 星系距银河系边缘的最小距离
export const GALAXY_MIN_SYSTEM_DIST = 60;    // 两个星系之间的最小距离
export const GALAXY_BG_STAR_COUNT = 400;     // 银河背景星星数量
export const STAR_TWINKLE_BASE = 1.2;       // 星星闪烁基础亮度(0~1)
export const STAR_TWINKLE_AMP = 0.3;        // 星星闪烁振幅(0~1)
export const GALAXY_VIEW_SCALE = 2.7;        // 银河地图可视范围缩放(越大看到越小范围)
export const HOME_DIR_ICON_SCALE = 0.06;     // 家乡方向箭头缩放比例
export const HOME_DIR_EDGE_MARGIN = 40;      // 箭头距屏幕边缘距离(px)

// ----- 恒星 (银河地图显示) -----
export const STAR_STANDARD_RADIUS = 72;      // 星系地图中恒星标准半径(px)
export const GALAXY_STAR_BASE_RADIUS = 6;    // 银河地图中恒星基础半径(px)
export const GALAXY_STAR_TYPE_BONUS = {      // 银河地图中各类型恒星额外半径
  redDwarf: 0,
  solarLike: 2,
  redGiant: 4,
  whiteDwarf: -1,
};
export const GALAXY_STAR_CLICK_PADDING = 10; // 银河地图中恒星点击区域额外半径
export const INDEX_ICON_SCALE = 0.03;        // 当前位置指示图标缩放比例
export const INDEX_ICON_OFFSET_X = -20;        // 指示图标X偏移(px)
export const INDEX_ICON_OFFSET_Y = 0;        // 指示图标Y偏移(px)
export const GALAXY_ICON_SCALE = 0.013;       // 银河地图中星系图标缩放比例
export const STAR_ICON_SCALE = 0.08;          // 星系地图中恒星图标缩放比例
export const PLANET_ICON_SCALE = 0.02;       // 星系地图中行星图标缩放比例

// ----- 行星 -----
export const PLANET_COUNT_MIN = 1;           // 每个星系行星数量下限
export const PLANET_COUNT_MAX = 5;           // 每个星系行星数量上限
export const PLANET_ORBIT_BASE = 120;        // 第一颗行星轨道半径(px)
export const PLANET_ORBIT_STEP = 60;         // 每多一颗行星轨道增加的半径(px)
export const PLANET_ORBIT_SPEED = 0.1;       // 行星公转角速度(弧度/秒)
export const PLANET_BASE_RADIUS = 12;        // 星系地图中行星基础半径(px)
export const PLANET_DENSITY_RADIUS_ADD = 8;  // 大气密度对行星半径的额外值
export const PLANET_CLICK_RADIUS = 20;       // 行星点击判定半径
export const PLANET_BG_COUNT = 1;            // 行星探索场景中背景图数量
export const PLANET_HE3_MIN = 2;             // 氦三储藏量下限(浮点数)
export const PLANET_HE3_MAX = 10;            // 氦三储藏量上限(浮点数)
export const HE3_ENERGY_MULT = 30;          // 采集氦三回复能量系数 (回复值 = 300 × 储藏量N)
export const HE3_HARVEST_DURATION = 3;       // 采集氦三读条时长(秒)
export const HARVEST_BTN_SCALE = 0.05;        // 采集按钮缩放比例
export const HARVEST_BTN_MARGIN_LEFT = 300;  // 采集按钮距左边距离(px)
export const HARVEST_BTN_MARGIN_BOTTOM = 15; // 采集按钮距底边距离(px)
export const HARVEST_BTN_TOOLTIP = '能量采集器'; // 采集按钮悬浮提示

// ----- NPC -----
export const NPC_MARGIN_RIGHT = 130;           // NPC距右边距离(px)
export const NPC_MARGIN_BOTTOM = 230;          // NPC距底边距离(px)
export const NPC_SLIDE_DURATION = 0.8;         // NPC滑入动画时长(秒)
export const NPC_CLICK_RADIUS = 40;          // NPC点击判定半径
export const NPC_PROFILE_SCALE = 0.18;        // NPC半身像缩放比例
export const NPC_BUBBLE_SCALE = 0.2;         // NPC对话气泡缩放比例
export const NPC_BUBBLE_OFFSET_X = -120;      // NPC气泡相对NPC左上方X偏移
export const NPC_BUBBLE_OFFSET_Y = -300;      // NPC气泡相对NPC左上方Y偏移
export const NPC_BUBBLE_TEXT_OFFSET_Y = -8;  // NPC气泡文字Y偏移
export const NPC_BUBBLE_TEXT_MAX_WIDTH = 180; // NPC气泡文字最大宽度（像素），超过自动换行
export const DETECTOR_BTN_SCALE = 0.05;      // 生命检测装置按钮缩放
export const DETECTOR_BTN_MARGIN_RIGHT = 600; // 检测装置距右边距离(px)
export const DETECTOR_BTN_MARGIN_BOTTOM = 20;// 检测装置距底边距离(px)
export const DETECTOR_BTN_TOOLTIP = '生命检测器'; // 检测装置悬浮提示
export const FIND_FRIEND_BTN_SCALE = 0.05;   // 召唤朋友按钮缩放
export const FIND_FRIEND_BTN_MARGIN_RIGHT = 730; // 召唤朋友按钮距右边距离(px)
export const FIND_FRIEND_BTN_MARGIN_BOTTOM = 20;// 召唤朋友按钮距底边距离(px)
export const FIND_FRIEND_BTN_TOOLTIP = '寻找这里的旅行者'; // 召唤朋友按钮悬浮提示
export const GALAXY_MAP_BTN_SCALE = 0.05;    // 银河地图按钮图标缩放
export const GALAXY_MAP_BTN_MARGIN_RIGHT = 480; // 银河地图按钮距右边距离(px)
export const GALAXY_MAP_BTN_MARGIN_BOTTOM = 20; // 银河地图按钮距底边距离(px)
export const ACTION_BAR_X = 280;             // 底部工具栏半透明背景X位置(px)
export const ACTION_BAR_Y = 590;             // 底部工具栏半透明背景Y位置(px)
export const ACTION_BAR_WIDTH = 600;         // 底部工具栏半透明背景宽度(px)
export const ACTION_BAR_HEIGHT = 110;        // 底部工具栏半透明背景高度(px)
export const ACTION_BAR_ALPHA = 0.4;         // 底部工具栏半透明背景透明度(0-1)

// ----- 新手引导 -----
export const TUTORIAL_SKIP = false;          // 开启后跳过新手引导

// ----- 调试 -----
export const DEBUG_START_NEAR_HOME = false;  // 开启后出生点直接放在故乡行星附近的星系（方便测试结局流程）

// ----- 序章 -----
export const PROLOGUE_SKIP = true;          // 开启后跳过序章
export const PROLOGUE_PARAGRAPH_DURATION = 1; // 每个段落显示时长(秒)
export const PROLOGUE_FADE_DURATION = 0.8;   // 段落淡入淡出时长(秒)
export const PROLOGUE_TEXT_MAX_WIDTH = 900;  // 文本最大宽度(px)，超过自动换行

// ----- 结局 -----
export const ENDING_TEXT_OFFSET_Y = -150;   // 结局文字Y轴偏移(px)，负数向上偏移
// 故乡降落后：主角说完所有 HOME_ENDING_LANDING_LINES 台词，再延迟 N 秒，第一个 NPC 出场
export const HOME_NPC_APPEAR_DELAY = 1.5;

// ----- 反派 NPC -----
// 正常 NPC 不刷的行星，按此概率刷反派 NPC（0~1）
export const BAD_NPC_SPAWN_CHANCE = 0.1;
// assets/characters/bad_npc 下可用素材数量（编号 1.png ~ N.png）
export const BAD_NPC_COUNT = 1;
// 反派 NPC 落地台词播完后，延迟多少秒自动出场
export const BAD_NPC_APPEAR_DELAY = 1.0;
// 反派 NPC 滑入屏幕（最后一句对话后的滑出）使用的时长（秒）
export const BAD_NPC_SLIDE_DURATION = 0.8;
// 反派 NPC 自动台词（"谢谢..."、"终于走了..."）每句显示时长（秒）
export const BAD_NPC_AUTO_BUBBLE_DURATION = 2.0;

// ----- 飞船 -----
export const SHIP_MAX_ENERGY = 2000;         // 飞船最大能量
export const SHIP_START_ENERGY = 600;        // 飞船初始能量
export const SHIP_NORMAL_SPEED = 1;          // 飞船普通航速
export const SHIP_FAST_SPEED = 2;          // 飞船加速航速
export const INTRA_SYSTEM_COST = 100;         // 星系内飞行固定能量消耗
export const INTER_SYSTEM_COST_MULT = 3;   // 星系间飞行能量系数 (能量 = 距离 × 系数)
export const INTRA_SYSTEM_FLIGHT_DIST = 100; // 星系内飞行的虚拟距离(影响飞行时长)

// ----- 飞行画面 -----
export const FLIGHT_DURATION_MULT = 0.3;    // 飞行时长系数 (时长 = 距离 × 系数 秒)
export const FLIGHT_DURATION_MIN = 2;        // 飞行最短时长(秒)
export const FLIGHT_DURATION_MAX = 120;       // 飞行最长时长(秒)
export const FLIGHT_GAMEOVER_DELAY = 4;      // 能量耗尽后到结算画面的延迟(秒)
export const FLIGHT_GAMEOVER_MUSIC_DELAY = 8; // 能量耗尽后播放结局音乐的等待时长(秒)
export const FLIGHT_SHIP_X = 0.3;            // 飞船在飞行画面的X位置(屏幕比例)
export const FLIGHT_SHIP_BOB_SPEED = 1.5;    // 飞船上下浮动频率
export const FLIGHT_SHIP_BOB_AMP = 8;        // 飞船上下浮动幅度(px)
export const FLIGHT_BASE_SCROLL_SPEED = 100; // 飞行背景基础滚动速度(px/秒)
export const FLIGHT_SKIP_INITIAL = 2;        // 跳跃道具初始次数
export const FLIGHT_SKIP_BTN_SCALE = 0.08;   // 跳跃道具图标缩放比例
export const FLIGHT_LAYER_SPEEDS = [0.3, 0.7, 1.0];  // 三层视差层速度比
export const FLIGHT_LAYER_COUNTS = [80, 50, 30];      // 三层视差层星星数量
export const FLIGHT_LAYER_SIZES = [1, 1.5, 2.5];      // 三层视差层星星大小
export const FLIGHT_LAYER_BRIGHTNESS = [0.4, 0.6, 0.9]; // 三层视差层亮度

// ----- 宇宙电台 -----
export const RADIO_BTN_SCALE = 0.15;          // 电台按钮缩放比例
export const RADIO_BTN_MARGIN_RIGHT = 20;     // 电台按钮距右边距离(px)
export const RADIO_BTN_MARGIN_BOTTOM = 20;    // 电台按钮距底边距离(px)
export const RADIO_TEXT_Y = 0.25;             // 电台文本Y位置(屏幕比例)
export const RADIO_VOICE_COUNT = 12;          // 电台语音数量
export const RADIO_ACTIVE_SCALE = 1.3;        // 电台播放时图标放大倍率
export const RADIO_TEXT_LINGER = 1;           // 每段文本额外停留时间(秒)

// ----- CD机 -----
export const CDJI_UNLOCK_ALL = false;         // 开启后默认解锁所有CD
export const CDJI_BTN_SCALE = 0.13;           // CD机按钮缩放比例
export const CDJI_BTN_MARGIN_RIGHT = 200;     // CD机按钮距右边距离(px)
export const CDJI_BTN_MARGIN_BOTTOM = 20;     // CD机按钮距底边距离(px)
export const CDJI_DRAWER_SCALE = 0.5;         // 抽屉面板缩放比例
export const CDJI_CD_SIZE = 150;               // CD图标显示尺寸(px)
export const CDJI_CD_PADDING = 20;            // CD图标间距(px)
export const CDJI_CD_COLS = 3;                // CD每行个数
export const CDJI_CD_OFFSET_Y = -30;          // CD网格在抽屉内的Y偏移(px)

// ----- 着陆/起飞动画 -----
export const LANDING_DESCENT_DURATION = 1.5; // 飞船降落动画时长(秒)
export const LANDING_DUST_DURATION = 1;      // 烟尘散去时长(秒)
export const LANDING_DUST_COUNT = 8;         // 着陆烟尘粒子数量
export const TAKEOFF_ASCENT_DURATION = 1.5;  // 飞船起飞动画时长(秒)
export const LANDED_SHIP_X = 0.5;            // 停靠飞船的X位置(屏幕比例)
export const LANDED_SHIP_Y = 0.65;           // 停靠飞船的Y位置(屏幕比例)
export const LANDED_SHIP_SCALE = 0.288;      // 停靠飞船缩放
export const FLAME_SCALE = 0.15;             // 尾焰缩放比例
export const FLAME_FPS = 8;                  // 尾焰帧切换速率(帧/秒)
export const FLAME_OFFSET_X = 0;             // 尾焰X偏移(px，相对飞船中心)
export const FLAME_OFFSET_Y = 230;            // 尾焰Y偏移(px，相对飞船中心)

// ----- 角色头像 -----
export const AVATAR_MARGIN_LEFT = 1;        // 头像距左边距离(px)
export const AVATAR_MARGIN_BOTTOM = 1;      // 头像距底边距离(px)
export const AVATAR_SCALE = 0.16;             // 头像缩放比例(相对原图)
export const AVATAR_IDLE_INTERVAL = 2;       // idle1/idle2切换间隔(秒)
export const AVATAR_BLINK_INTERVAL = 5;      // 眨眼间隔(秒)
export const AVATAR_BLINK_DURATION = 0.2;    // 眨眼图片停留时长(秒)
export const BUBBLE_OFFSET_X = -50;           // 气泡相对角色右上方X偏移(px)
export const BUBBLE_OFFSET_Y = -120;          // 气泡相对角色右上方Y偏移(px)
export const BUBBLE_SCALE = 0.2;            // 气泡图片缩放比例
export const BUBBLE_TEXT_OFFSET_Y = -8;      // 文字在气泡内的Y偏移(px，负值往上)
export const BUBBLE_DURATION = 4;            // 气泡显示时长(秒)

// ----- UI文本字号 -----
export const UI_TEXT_FONT_SIZE = 20;         // 左上角信息文字大小(px)
export const UI_TEXT_LINE_HEIGHT = 25;       // 左上角信息行高(px)

// ----- 字幕/制作人员名单 -----
export const CREDITS_SCROLL_SPEED = 40;      // 字幕滚动速度(px/秒)
export const CREDITS_OVERLAY_ALPHA = 0.7;    // 字幕背景遮罩透明度

// ----- 地形高度 (屏幕比例) -----
export const GROUND_Y = {
  terrestrial:      1,
  iceGiant:         1,
  rockyTerrestrial: 0.72,
  dwarfPlanet:      0.78,
};
