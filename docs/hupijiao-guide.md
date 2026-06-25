---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '378b5ba3-cb1a-4bb0-808f-d5b5f5f50807'
  PropagateID: '378b5ba3-cb1a-4bb0-808f-d5b5f5f50807'
  ReservedCode1: '55c07bee-ef2d-44d6-a457-d04728ddbdc4'
  ReservedCode2: '55c07bee-ef2d-44d6-a457-d04728ddbdc4'
---

# DeepSeal 接入虎皮椒支付指南

## 概述

虎皮椒（xunhupay.com）是一款面向个人开发者的在线收款平台，支持微信/支付宝个人收款，无需企业资质。本文档指导你为 DeepSeal 专业版接入虎皮椒自动发卡。

---

## 1. 虎皮椒注册与配置

### 1.1 注册账号

1. 访问 https://www.xunhupay.com 注册账号
2. 完成实名认证（需身份证）
3. 绑定微信/支付宝收款账号

### 1.2 创建商品（自动发卡）

1. 进入 **商品管理** → **添加商品**
2. 填写：
   - 商品名称：`DeepSeal 专业版 — 1年订阅`
   - 商品价格：`98.00`（元）
   - 商品类型：**虚拟商品/自动发卡**
   - 发卡方式：**API 自动发卡**
3. 同样创建月度商品：
   - 商品名称：`DeepSeal 专业版 — 1个月`
   - 商品价格：`12.00`
   - 商品类型：**虚拟商品/自动发卡**

### 1.3 获取密钥

进入 **账户设置** → **密钥管理**：
- **App ID**：`xxxxx`（平台分配）
- **App Secret**：`xxxxxxxxxxxxxxxx`（32位，保密保存）

---

## 2. 支付流程设计

```
用户点击「购买专业版」
       ↓
官网打开支付页面（扫码/跳转）
       ↓
用户完成支付（微信/支付宝）
       ↓
虎皮椒回调通知你的服务器
       ↓
服务器生成 License（基于机器码）
       ↓
服务器返回激活码给用户（页面展示 + 邮件）
       ↓
用户在 DeepSeal 中粘贴激活码
       ↓
应用本地验证 → 激活成功
```

### 关键设计点

- **用户先输入机器码**：支付前要求用户提供 DeepSeal 机器码（应用内「设置 → 激活专业版」页面可复制）
- **License 预生成**：在支付流程中收集机器码，支付成功后立即生成绑定该机器码的激活码
- **无需数据库**：License 验证完全在本地进行，服务器只负责生成和分发

---

## 3. 官网支付页面实现

### 3.1 用户交互流程

```
[Step 1: 选择套餐]
  ┌─────────────────┬─────────────────┐
  │   1个月 ¥12     │   1年 ¥98(推荐)  │
  └─────────────────┴─────────────────┘

[Step 2: 输入机器码]
  ┌──────────────────────────────┐
  │  请粘贴 DeepSeal 机器码:      │
  │  [___________________________] │
  │  (从 DeepSeal → 设置 → 激活   │
  │   专业版 中复制)               │
  └──────────────────────────────┘

[Step 3: 支付]
  ┌────────────┬────────────┐
  │  微信扫码   │  支付宝扫码  │
  └────────────┴────────────┘

[Step 4: 获取激活码]
  ┌──────────────────────────────┐
  │  ✅ 支付成功！                │
  │  激活码：SN2-xxxx:xxxx:xxxx   │
  │  [复制激活码] [打开DeepSeal]   │
  └──────────────────────────────┘
```

### 3.2 前端关键代码（官网 hypergrad.cn）

```javascript
// === 配置 ===
const HUPIJIAO_APP_ID = '你的AppID';
const HUPIJIAO_NOTIFY_URL = 'https://hypergrad.cn/api/pay/notify';
const HUPIJIAO_RETURN_URL = 'https://hypergrad.cn/pay/success';

// === 发起支付 ===
async function createOrder(productId, machineId) {
  // 1. 生成订单号
  const orderId = 'DS-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  
  // 2. 构造参数
  const params = {
    version: '1.1',
    appid: HUPIJIAO_APP_ID,
    trade_order_id: orderId,        // 你的订单号
    total_fee: productId === 'yearly' ? '98.00' : '12.00',
    title: productId === 'yearly' 
      ? 'DeepSeal 专业版 — 1年订阅' 
      : 'DeepSeal 专业版 — 1个月',
    time: Math.floor(Date.now() / 1000).toString(),
    notify_url: HUPIJIAO_NOTIFY_URL,
    return_url: HUPIJIAO_RETURN_URL + '?order=' + orderId,
    nonce_str: Math.random().toString(36).slice(2, 14),
    type: 'WAP',                     // WAP = 手机网页支付
    wap_url: 'https://hypergrad.cn',
    wap_name: 'DeepSeal',
    // 自定义参数：机器码（原样返回）
    attach: machineId,
  };

  // 3. 签名（重要！）
  params.hash = signParams(params, APP_SECRET);

  // 4. 提交到虎皮椒
  const resp = await fetch('https://api.xunhupay.com/payment/do.html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await resp.json();
  
  if (data.errcode !== 0) {
    throw new Error(data.errmsg || '创建支付失败');
  }
  
  // 5. 跳转到支付页面
  window.location.href = data.url_qrcode || data.url;
}

// === HMAC-MD5 签名 ===
function signParams(params, secret) {
  // 1. 按键名字典序排列
  const sorted = Object.keys(params)
    .filter(k => k !== 'hash' && params[k] !== '')
    .sort();
  // 2. 拼接 key=value&
  const str = sorted.map(k => `${k}=${params[k]}`).join('&');
  // 3. 拼接密钥
  const signStr = str + secret;
  // 4. MD5 (需引入 md5 库)
  return md5(signStr);
}
```

### 3.3 签名算法详解

虎皮椒使用 **MD5 签名**（非 HMAC），步骤：

```
1. 过滤空值和 hash 字段
2. 按键名 ASCII 升序排列
3. 拼接为 k1=v1&k2=v2&...&kn=vn
4. 末尾追加 App Secret: k1=v1&...&kn=vn_SECRET
5. 对整个字符串做 MD5，得到 32 位小写十六进制字符串
```

---

## 4. 服务器端回调处理

### 4.1 回调接口 POST /api/pay/notify

```javascript
// Node.js / Express 示例
const crypto = require('crypto');
const { generateActivationCode } = require('./license-gen');

const APP_SECRET = '你的AppSecret';
const HMAC_KEY = 'DeepSeal2026@Secret!';  // 与应用内一致！

app.post('/api/pay/notify', express.urlencoded({ extended: false }), async (req, res) => {
  const data = req.body;
  
  // 1. 验证签名
  const expectedHash = signParams(data, APP_SECRET);
  if (data.hash !== expectedHash) {
    return res.status(400).send('invalid signature');
  }
  
  // 2. 检查支付状态
  if (data.status !== 'OD') {
    return res.send('success'); // OD = 订单完成
  }
  
  // 3. 获取参数
  const orderId = data.trade_order_id;     // 你的订单号
  const machineId = data.attach;            // 机器码
  const totalFee = parseFloat(data.total_fee);
  
  // 4. 防重复处理（建议用文件或 Redis 记录已处理订单）
  // ... skip duplicated check ...
  
  // 5. 根据金额确定有效期
  let expiry;
  if (totalFee >= 98) {
    expiry = '1YEAR';  // 1年到期的 Unix 时间戳
  } else {
    expiry = '1MONTH'; // 1个月
  }
  
  // 6. 生成激活码
  const activationCode = generateActivationCode(machineId, expiry);
  
  // 7. 存储到待领取表（供 return_url 页面查询）
  await storeActivationCode(orderId, activationCode);
  
  // 8. 回复虎皮椒
  res.send('success');
});
```

### 4.2 License 生成函数（Node.js 版本）

```javascript
const crypto = require('crypto');
const BASE64_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function generateActivationCode(machineId, period) {
  // 计算过期时间
  let expiry;
  if (period === 'FOREVER') {
    expiry = 'FOREVER';
  } else {
    const now = new Date();
    if (period === '1YEAR') {
      now.setFullYear(now.getFullYear() + 1);
    } else if (period === '1MONTH') {
      now.setMonth(now.getMonth() + 1);
    }
    expiry = Math.floor(now.getTime() / 1000).toString();
  }
  
  // HMAC-SHA256 签名（与 Rust 应用一致）
  const message = `${machineId}|${expiry}`;
  const hmac = crypto.createHmac('sha256', 'DeepSeal2026@Secret!');
  hmac.update(message);
  const signature = hmac.digest('base64');
  
  return `SN2-${machineId}:${expiry}:${signature}`;
}
```

---

## 5. 支付成功页面

用户支付完成后跳转回 `return_url`，查询激活码：

```javascript
// /pay/success 页面
async function showActivationCode(orderId) {
  // 轮询查询（回调可能有几秒延迟）
  let attempts = 0;
  while (attempts < 30) {
    const resp = await fetch(`/api/pay/query?order=${orderId}`);
    const data = await resp.json();
    if (data.code) {
      // 显示激活码
      document.getElementById('code').textContent = data.code;
      return;
    }
    await new Promise(r => setTimeout(r, 2000)); // 等 2 秒重试
    attempts++;
  }
  document.getElementById('code').textContent = '正在生成激活码，请稍后刷新页面...';
}
```

---

## 6. 安全注意事项

### 6.1 HMAC 密钥保护

- `DeepSeal2026@Secret!` 是应用内验证 License 的 HMAC 密钥
- 此密钥 **必须只在服务端** 使用，**绝不能**暴露在前端代码中
- 服务器环境变量存储，不要硬编码

### 6.2 防止订单重复处理

- 回调可能重复发送，必须做幂等处理
- 建议用 Redis/文件记录已处理的 `trade_order_id`

### 6.3 金额校验

- 回调中验证 `total_fee` 与商品价格一致，防止金额篡改
- 不要仅依赖前端传递的价格参数

### 6.4 HTTPS

- `notify_url` 和 `return_url` 必须使用 HTTPS
- 虎皮椒不允许 HTTP 回调地址

### 6.5 前端代码混淆

官网前端代码中不要包含任何服务端逻辑或密钥。License 生成必须在服务端完成。

---

## 7. 服务器部署建议

### 7.1 最简架构

```
hypergrad.cn (腾讯云香港轻量)
├── /               → 官网静态页面 (Nginx)
├── /api/pay/notify → 支付回调 (Node.js / Python)
├── /api/pay/query  → 查询激活码 (Node.js / Python)
└── /pay/success    → 支付成功页 (静态 HTML + JS)
```

### 7.2 Nginx 配置示例

```nginx
server {
    listen 443 ssl http2;
    server_name hypergrad.cn;
    
    ssl_certificate     /etc/letsencrypt/live/hypergrad.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hypergrad.cn/privkey.pem;
    
    # 官网静态文件
    location / {
        root /var/www/deepseal-site;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 支付 API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.3 依赖安装

```bash
# Node.js 服务端
npm init -y
npm install express md5 cors

# 用 PM2 守护进程
npm install -g pm2
pm2 start server.js --name deepseal-pay
pm2 save && pm2 startup
```

---

## 8. 完整支付测试清单

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 官网选择套餐，输入机器码 | 跳转微信/支付宝支付页面 |
| 2 | 扫码支付 | 支付成功 |
| 3 | 回调到达 | 服务器生成激活码 |
| 4 | return_url 页面 | 显示激活码 |
| 5 | 复制激活码到 DeepSeal | 激活成功 |
| 6 | 重启 DeepSeal | 仍为专业版 |
| 7 | 等待自动重检（5分钟） | 专业版状态正常 |
| 8 | 修改系统时间到过期后 | 显示过期提示 |

---

## 9. 虎皮椒 API 参考速查

### 创建支付订单

```
POST https://api.xunhupay.com/payment/do.html

必填参数:
  version       = "1.1"
  appid         = 你的AppID
  trade_order_id = 你的订单号（唯一）
  total_fee     = 金额（字符串，如 "98.00"）
  title         = 商品标题
  time          = Unix 时间戳
  notify_url    = 支付成功回调地址
  nonce_str     = 随机字符串
  hash          = MD5 签名

返回:
  errcode = 0    成功
  url       支付页面 URL（PC 端）
  url_qrcode 支付二维码 URL（移动端）
```

### 回调参数

```
POST notify_url

status           = "OD"（订单完成）
appid            = AppID
trade_order_id   = 你的订单号
transaction_id   = 虎皮椒流水号
total_fee        = 实际支付金额
time             = 时间戳
attach           = 自定义参数（机器码）
hash             = 签名
```

### 签名算法

```
1. 所有非空非hash参数，按key升序排列
2. 拼接: key1=value1&key2=value2&...&keyN=valueN
3. 末尾追加 AppSecret
4. MD5 得到 32位小写hex
```

> AI生成