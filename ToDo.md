## 一、 bug 修复
- 1. 启动项目或刷新页面后，搜索框会出现 claude 的网址，干扰搜索
- 2. 文章解析必须经过 LLM 处理，不能臆测，比如链接 “https://www.xiaohongshu.com/explore/69d3418b0000000023014652?xsec_token=ABXy0SChn2ZYnECMcNtqyNEkgduCe19MA71RjXLHDDxzE=&xsec_source=pc_feed”   你现在解析出来 标题是 “汉阳关注汉阳关注汉阳关注汉阳关注 的内容”，实际应当是 “美国兵随身带的” 原文标题（如果有收录同一作者多篇，则取最新的）
- 3. 作者栏：“汉阳” 而非 “汉阳关注汉阳关注汉阳关注汉阳关注”
- 4. 收藏链接时，应当一并收藏封面图
## 二、产品更新
- 1. 当前美学风格 AI 味儿太重，需要改为文艺复兴时期美学风格 参考 '/Users/martin/Desktop/WorkSpace/infoMind/public/assets/home-img.png'
- 2. 新增一个页面 根据用户当前收录的知识类别，生成一张热力图，图片左侧为 折线图（记录用户近一周收录知识的趋势可筛选近1周、1月、1年），右侧为热力图（记录用户当前所关注的知识内容，不同于首页的类别，这里需要 LLM 实时分析去拆解所有的内容按知识点归类（为了节省token 应当把存量内容做数据记录，每次分析新增内容即可），比如 有十篇帖子来自不同平台是关于 Claude 的在一个格子中，有15篇帖子是关于 PhotoShop 的在一个格子中）每个格子需要展示对应知识点的 icon 图标，遵循 icon 参考原则

## 三、icon参考原则
如果是专业工具则使用官网图标，如果无法提取则优先参考以下两个icon库网站，如果是非工具类的概念，需要寻找一个最贴合该概念的 icon 进行表示
- AI 类icon 参考：https://lobehub.com/zh/icons
- Ali 常用icon 参考：https://www.iconfont.cn/?spm=a313x.search_index.i3.d4d0a486a.7ca93a81x2TmaF

