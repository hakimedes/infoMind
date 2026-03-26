---
name: infomind
description: 个人知识管理系统 - 收藏和管理网络内容链接（支持 YouTube、Bilibili、Twitter、小红书、知乎等主流平台）
---

## 添加链接到知识库

当用户发送 URL 链接并要求收藏/保存/记录/稍后看时，调用此接口将链接添加到 InfoMind 知识库。

POST http://localhost:3456/api/entries
Content-Type: application/json

{
  "url": "{{用户提供的URL}}",
  "note": "{{用户的备注，没有就不传}}"
}

成功后，向用户说明已将内容收录到某个分类的书架中。

## 搜索知识库内容

当用户提问"我之前看的关于XXX的内容"、"帮我查一下XXX"等搜索类问题时，调用此接口。

GET http://localhost:3456/api/entries/search?q={{关键词}}

将搜索结果整理后告知用户。

## 查看特定分类内容

当用户要查看某个分类（如"AI"、"心理学"、"历史"）下的内容时，调用此接口。

GET http://localhost:3456/api/entries?category={{分类名}}&limit=10

常用分类：人工智能、计算机科学、心理学、哲学、历史、经济与金融、商业与管理、艺术与设计、影视与娱乐

## 查看知识库统计

当用户问"我收藏了多少内容"、"给我看统计"等时，调用此接口。

GET http://localhost:3456/api/stats

向用户汇报总条目数、书架数量、分类情况等。
