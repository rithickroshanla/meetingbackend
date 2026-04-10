# 🏥 VitaScore — Health & Lifespan Predictor

An ML-powered web app that analyzes your daily food habits and gives you:
- Total calorie & nutrition breakdown
- Health score (0–100)
- Projected health curve over time
- Personalized recommendations

## 📁 Project Structure

```
health_predictor/
├── health_app/
│   ├── ml_model/
│   │   ├── train_model.py     # ML model + nutrition logic
│   │   └── model.pkl          # Auto-generated after training
│   ├── templates/
│   │   └── index.html         # Full frontend UI
│   ├── views.py               # Django API endpoints
│   └── urls.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── manage.py
├── requirements.txt
├── render.yaml                # Render deployment config
└── netlify.toml               # Netlify proxy config
```

## 🚀 Local Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Train the ML model
python health_app/ml_model/train_model.py

# 3. Run the server
python manage.py runserver

# 4. Open browser
# http://127.0.0.1:8000
```

## 🌐 Deploy to Render (Backend)

1. Push this folder to a GitHub repo
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and deploy
5. Copy your Render URL (e.g. `https://vitascore.onrender.com`)

## 🌐 Deploy Frontend to Netlify (Optional)

If you want to separate frontend/backend:

1. Copy `health_app/templates/index.html` into a `/frontend` folder
2. In `index.html`, replace `/api/predict/` with your full Render URL:
   ```js
   const res = await fetch('https://YOUR-APP.onrender.com/api/predict/', ...);
   ```
3. In `netlify.toml`, replace `YOUR-RENDER-APP` with your Render subdomain
4. Deploy the `/frontend` folder to Netlify

> **Tip**: Since the app is Django-rendered, you can just use Render alone — Netlify is optional.

## 🤖 How the ML Model Works

| Input | Description |
|---|---|
| Age, Weight, Height | Personal biometrics |
| Gender | Affects BMR calculation |
| Activity Level | Sedentary → Active |
| Breakfast / Lunch / Dinner / Snacks | Free-text food entries |

**Output:**
- Total calories, protein, carbs, fat, fiber
- BMI + BMI category
- Health score (0–100) blended from Random Forest + rule engine
- Projected health curve across future age milestones
- Personalized recommendations if score < 60

## 🍽️ Supported Foods (type these in meal fields)

rice, bread, egg, milk, chicken, fish, vegetables, fruits, dal, roti,
idli, dosa, oats, banana, rice and curry, sambar rice, chapati, poha, upma, and more.

> Any unrecognized food uses a default average (200 kcal, 5g protein, 30g carbs).
