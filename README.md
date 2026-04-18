

# LightPxl GitLab Tracker

> Effortless, beautiful analytics for your GitLab teams. DORA metrics, velocity, and developer insights in a Linear-inspired dashboard.

---

## 🚀 Features

- **Dynamic GitLab Connection**: Connect with your own Personal Access Token, custom URL, and group.
- **DORA Metrics**: Track deployment frequency, lead time, change failure rate, and MTTR.
- **Velocity & Insights**: Visualize team velocity, issue flow, and developer impact.
- **Modern UI**: Clean, minimal, and responsive—Linear-inspired for clarity and speed.
- **Fast & Secure**: Built with React, Vite, TypeScript, and Tailwind CSS.

---

## 🛠️ Getting Started

1. **Clone the repo:**
	```sh
	git clone https://github.com/LightPxl/gitlab-tracker.git
	cd gitlab-tracker
	```
2. **Install dependencies:**
	```sh
	npm install
	```
3. **Configure environment:**
	Create a `.env` file:
	```env
	VITE_GITLAB_URL=https://gitlab.com
	VITE_GITLAB_GROUP_ID=52
	```
4. **Run locally:**
	```sh
	npm run dev
	```

---

## 🌐 Deployment

- **GitHub Pages:**
  - Push to `main` branch. GitHub Actions auto-builds and deploys to Pages.
  - Configure your repo: Settings → Pages → Source: GitHub Actions.
- **Other:**
  - Deploy `dist/` to Vercel, Netlify, or your static host.

---

## 📄 License

MIT. See [LICENSE](LICENSE).

---

© 2026 LightPxl. Open source on [GitHub](https://github.com/LightPxl/gitlab-tracker).
