# NPC玩法设计
## 数据设计
存在：src/data/npc-data.js

## 数据结构说明
name: npc的名字
profile_asset：半身像的资源路径
appear_at：npc的刷新机制，planet_type说明只会在这个类型的星球刷新，explore_range的min和max定义了玩家要探索多少个这种类型的星球才会刷新这个npc，在这个范围内随机一个值
dialogue和my_dialogue定义了npc和玩家要对话的内容，交替说下一句，npc先说
cd_name：对话结束后，要给玩家解锁的cd数据，对应src/data/cd-data.js这里的name字段
with_ending: 

## 送给玩家的音乐
送给玩家一个cd，相关数据结构：src/data/cd-data.js
玩家的数据结构里面新增一个已有cd列表，存放已经解锁的cd的数据结构列表。

## npc的刷新机制说明
npc只会刷新一次，再次返回相同星球，npc不会出现了

## 打招呼喇叭
玩家进入星球探索界面后，下方的工具面板会有一个生命检测装置的按钮，如果这个星球刷新了npc，这个按钮则会闪烁，点击停止闪烁，并唤出npc

## 生命检测装置的按钮
玩家点击生命检测装置按钮后，会播放一段音效：
播放完成后，npc出现在右下方，并显示对话气泡，npc的对话气泡为：assets\ui\bubble_right.png

## 赠送礼物环节
dialogue和my_dialogue对话完成后，根据gift_dialogue中npc和player的对话列表是不是为空，来判断是否弹出一个对话框【是否送礼物给{NPC的名字}】，有对话列表的话就弹出，为空的话跳过这个赠送礼物环节
选择是的话，触发送礼物对话，对话内容配置在npc-data的gift_dialogue字段
对话完成后，with_ending设置为true
