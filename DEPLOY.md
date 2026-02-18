# Second Brain — 部署指南

## Google Sheet
已创建: [Second Brain DB](https://docs.google.com/spreadsheets/d/1fyAdMu8RwcIOXBGyUhK3qqS8r-IOFVRFUokRLLaT41I/edit)
- Sheet ID: `1fyAdMu8RwcIOXBGyUhK3qqS8r-IOFVRFUokRLLaT41I`
- Tabs: Memory, Contacts, Todos, Knowledge, QuickNotes
- 表头已写入

## 部署 Apps Script（需要 Dong 手动操作）

1. 打开 [Second Brain DB](https://docs.google.com/spreadsheets/d/1fyAdMu8RwcIOXBGyUhK3qqS8r-IOFVRFUokRLLaT41I/edit)
2. **Extensions → Apps Script**
3. 删除默认的 `Code.gs` 内容，粘贴 `apps-script.gs` 的全部代码
4. **Deploy → New deployment**
5. 类型选 **Web app**
6. 设置:
   - Description: `Second Brain API`
   - Execute as: **Me** (dong.m@oneyco.com.au)
   - Who has access: **Anyone**
7. 点 **Deploy**
8. 授权弹窗 → 允许
9. 复制 Web app URL（类似 `https://script.google.com/macros/s/AKfycb.../exec`）
10. 粘贴到 `config.js` 的 `API_URL` 字段

## 测试
浏览器打开: `{API_URL}?key=sb-oney-2026&sheet=QuickNotes`
应返回 JSON: `{"headers":["id","timestamp","note","from"],"rows":[]}`

## 更新代码
如需更新 Apps Script → Extensions → Apps Script → 编辑 → Deploy → Manage deployments → 编辑 → New version → Deploy

## Git Push
```bash
cd ~/clawd/oney-co/products/second-brain
git add -A && git commit -m "feat: Google Sheets integration" && git push
```
