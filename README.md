<<<<<<< HEAD

KPM Vegetables - Updated App (Amplify Ready)

Contents:
- src/App.js (main app with Login, Dashboard, Backup & Restore)
- src/config.js (API wrapper pointing to your API Gateway)
- src/index.js, src/index.css
- package.json, amplify.yml

How to deploy:
1. unzip and push to your GitHub repo (origin should be set to your Amplify app)
2. git add ., git commit -m "KPM Updated App", git push
3. Amplify will auto-deploy the build.

Default Admins:
Username: PARTHI / Password: parthi123
Username: PRABU / Password: prabu123
=======
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
>>>>>>> 01a218b02226c3fea1d954794db6943aa4d30da1
