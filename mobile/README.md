# Invictus Logistics Mobile App

物流管理移动应用，支持条形码扫描、仓库管理和运输管理。

## 🚀 快速开始

### 安装依赖
```bash
cd mobile
npm install
```

### 运行应用
```bash
npm start
```

然后选择:
- 按 `i` - iOS 模拟器
- 按 `a` - Android 模拟器
- 扫描二维码 - 使用手机上的 Expo Go app

## 📱 功能

- 🔐 员工登录认证
- 📦 仓库管理 (入库/出库)
- 🚚 运输管理
- 📷 条形码扫描

## 🔧 配置

API URL 在 `app.config.js` 中配置，默认为 `http://localhost:3001`

## 📁 项目结构

```
mobile/
├── src/
│   ├── components/    # 组件 (BarcodeScanner等)
│   ├── screens/       # 页面 (Login, Warehouse, Shipping等)
│   ├── navigation/    # 导航配置
│   ├── services/      # API 和认证服务
│   ├── contexts/      # React Contexts
│   └── types/         # TypeScript 类型
├── App.tsx            # 根组件
└── app.config.js      # Expo 配置
```

## 🔑 技术栈

- Expo SDK 54
- React Navigation
- Expo Camera (条形码扫描)
- Axios (API 调用)
- AsyncStorage (本地存储)
- TypeScript
