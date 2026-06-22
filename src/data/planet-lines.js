export const PLANET_LINES = [
  {
    condition: (p) => p.type === 'iceGiant' && p.atmosphericDensity > 0.7,
    lines: ['好冷...大气压也好高...', '这颗冰巨星不太友好啊。', '这里的环境很恶劣，最好不要停留太久。'],
  },
  {
    condition: (p) => p.type === 'iceGiant',
    lines: ['好冷啊，这里全是冰！', '这颗行星的环境很恶劣。'],
  },
  {
    condition: (p) => p.type === 'terrestrial' && p.atmosphericDensity > 0.6,
    lines: ['空气很浓厚，有点像家。'],
  },
  {
    condition: (p) => p.type === 'terrestrial',
    lines: ['看起来是颗宜居的星球。', '这颗行星的环境不错。', '这里的环境很适合人类。'],
  },
  {
    condition: (p) => p.type === 'rockyTerrestrial',
    lines: ['到处都是岩石...', '这里的地形很崎岖。', '这颗行星的环境不太适合人类。'],
  },
  {
    condition: (p) => p.type === 'dwarfPlanet',
    lines: ['好小的星球，重力很轻。', '这颗矮行星的环境很恶劣。', '这里的环境不太适合人类。'],
  },
  {
    condition: (p) => p.atmosphericDensity > 0.8,
    lines: ['大气好浓，呼吸有点困难...'],
  },
  {
    condition: (p) => p.atmosphericDensity < 0.2,
    lines: ['几乎没有大气层，要小心。'],
  },
  {
    condition: () => true,
    lines: ['到达新的星球了。'],
  },
];
