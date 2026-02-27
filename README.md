# HostCore Mobile Cloud 📱☁️

HostCore Mobile Cloud is a fully self-hosted, reverse-proxy-based app hosting platform designed specifically to run entirely inside **Termux** on Android. It provides a portable PaaS (Platform as a Service) environment similar to Heroku or Vercel, right in your pocket.

## 🚀 Features

- **Multi-App Hosting:** Run multiple Node.js, Python, and Static HTML apps simultaneously.
- **Dynamic Reverse Proxy:** Automatic routing from `/appname` to internal ports.
- **Mobile-Optimized UI:** A beautiful, responsive dashboard for managing everything from your phone.
- **Real-Time Monitoring:** Live WebSocket-based CPU, RAM, and App status tracking with Chart.js.
- **Deployment Engine:** Simply upload a ZIP file; HostCore handles extraction, dependency installation (npm/pip), and process management.
- **Multi-User Isolation:** Secure JWT-based authentication with isolated app management per user.
- **Database Management:** Built-in support for SQLite, with status tracking for MariaDB and PostgreSQL.
- **Integrated File Manager:** Browse and view application files directly from the web interface.
- **Ngrok Integration:** Easily expose your local server to the internet with a single click.
- **Automated Backups:** Daily scheduled backups of all your apps and data.
- **Process Management:** Powered by PM2 for high availability and automatic restarts.

## 🛠 Tech Stack

- **Backend:** Node.js, Express, SQLite, PM2, Socket.io, Systeminformation
- **Frontend:** HTML5, Bootstrap 5, Chart.js, Vanilla JS
- **Tunneling:** Ngrok

## 📲 Installation in Termux

Follow these steps to get HostCore running on your Android device:

1. **Update and Upgrade Termux:**
   ```bash
   pkg update && pkg upgrade
   ```

2. **Install Dependencies:**
   ```bash
   pkg install nodejs git python mariadb postgresql
   ```

3. **Clone the Repository:**
   ```bash
   git clone https://github.com/abdulraheemnohri/HostCore-Mobile-Cloud.git
   cd HostCore-Mobile-Cloud
   ```

4. **Install Node Packages:**
   ```bash
   npm install
   ```

5. **Start the Platform:**
   ```bash
   ./start.sh
   ```

6. **Access the Dashboard:**
   Open your browser and navigate to `http://localhost:3000`.

## 📂 Project Structure

```text
hostcore-mobile/
├── server.js           # Core Server & API
├── database.db         # SQLite System DB
├── apps/               # Deployed Applications
├── uploads/            # Temporary ZIP uploads
├── backups/            # System Backups
├── public/             # Web Frontend
│   ├── dashboard.html  # System Stats & Charts
│   ├── deploy.html     # App Deployment
│   ├── apps.html       # App & File Management
│   └── ...
├── backup.sh           # Backup Script
└── start.sh            # Initialization Script
```

## ⚠️ Limitations

- **No Docker:** Runs directly on the Android kernel via Termux.
- **Traffic:** Not suitable for high-traffic production use (dependent on phone hardware).
- **Backgrounding:** Android may kill Termux if battery optimization is not disabled for the app.

## 🔗 Repository
[https://github.com/abdulraheemnohri/HostCore-Mobile-Cloud](https://github.com/abdulraheemnohri/HostCore-Mobile-Cloud)

---
Developed for the portable cloud revolution. 🚀
