# 🥦 KPM Vegetables Cloud App

A modern cloud-based payment & management system for KPM Vegetables — powered by AWS API Gateway, Lambda, DynamoDB, and Amplify Hosting.

---

## 🚀 One-Click Deploy

Click below to deploy instantly to AWS Amplify 👇

[![Deploy to Amplify Console](https://oneclick.amplifyapp.com/button.svg)](https://console.aws.amazon.com/amplify/home#/deploy?repo=https://github.com/giantpoker69/kpm-vegetables-app)

---

## ⚡ Quick Start (for manual setup)

1️⃣ **Clone this repo**
```bash
git clone https://github.com/giantpoker69/kpm-vegetables-app.git
cd kpm-vegetables-app
```

2️⃣ **Install dependencies**
```bash
npm install
```

3️⃣ **Run locally**
```bash
npm start
```

4️⃣ **Deploy to AWS Amplify**
- Visit 👉 https://aws.amazon.com/amplify/
- Click **“Host your web app” → Connect GitHub**
- Choose repo **giantpoker69/kpm-vegetables-app**
- Select branch **main**
- Deploy 🎉

---

## ☁️ Backend API (AWS)

Your frontend connects to:
```
https://soucauwn16.execute-api.ap-south-1.amazonaws.com/prod
```

Make sure your AWS Lambda functions and DynamoDB tables are active before deploying.

---

## 🧩 Build Settings (for Amplify)

The `amplify.yml` file is already included and looks like this:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

---

Made with ❤️ by Parthi & Team
