import json
import pickle
import os
import sys
import numpy as np
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# ── Load model ───────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "ml_model", "model.pkl")

with open(MODEL_PATH, "rb") as f:
    ML_MODEL = pickle.load(f)

# ── Import helpers from train_model ──────────────────────────────────────────
sys.path.insert(0, os.path.join(BASE_DIR, "ml_model"))
from train_model import (
    parse_meal_nutrition,
    compute_health_score,
    generate_lifespan_curve,
    get_recommendations,
)

ACTIVITY_MAP = {"sedentary": 0, "light": 1, "moderate": 2, "active": 3}
GENDER_MAP   = {"female": 0, "male": 1}


def index(request):
    return render(request, "index.html")


@csrf_exempt
def predict(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data      = json.loads(request.body)
        age       = int(data["age"])
        weight    = float(data["weight"])
        height    = float(data["height"])
        gender    = data["gender"].lower()
        activity  = data["activity"].lower()
        breakfast = data.get("breakfast", "")
        lunch     = data.get("lunch", "")
        dinner    = data.get("dinner", "")
        snacks    = data.get("snacks", "")

        b = parse_meal_nutrition(breakfast)
        l = parse_meal_nutrition(lunch)
        d = parse_meal_nutrition(dinner)
        s = parse_meal_nutrition(snacks) if snacks else np.zeros(5)

        total = b + l + d + s
        total_cal, protein, carbs, fat, fiber = total

        bmi = weight / ((height / 100) ** 2)

        X = np.array([[
            age, weight, height,
            GENDER_MAP.get(gender, 0),
            ACTIVITY_MAP.get(activity, 1),
            total_cal, protein, fiber, fat
        ]])
        ml_score   = float(ML_MODEL.predict(X)[0])
        rule_score = compute_health_score(
            age, weight, height, gender, activity,
            total_cal, protein, carbs, fat, fiber
        )
        final_score = round((ml_score * 0.5 + rule_score * 0.5), 1)

        ages_curve, scores_curve = generate_lifespan_curve(final_score, age)
        recs = get_recommendations(final_score, bmi, protein, fiber, fat, total_cal)

        meal_breakdown = {
            "breakfast": {"calories": round(b[0]), "protein": round(b[1],1), "carbs": round(b[2],1), "fat": round(b[3],1)},
            "lunch":     {"calories": round(l[0]), "protein": round(l[1],1), "carbs": round(l[2],1), "fat": round(l[3],1)},
            "dinner":    {"calories": round(d[0]), "protein": round(d[1],1), "carbs": round(d[2],1), "fat": round(d[3],1)},
            "snacks":    {"calories": round(s[0]), "protein": round(s[1],1), "carbs": round(s[2],1), "fat": round(s[3],1)},
        }

        return JsonResponse({
            "health_score": final_score,
            "bmi": round(bmi, 1),
            "bmi_category": bmi_category(bmi),
            "nutrition": {
                "total_calories": round(total_cal),
                "protein_g":      round(protein, 1),
                "carbs_g":        round(carbs, 1),
                "fat_g":          round(fat, 1),
                "fiber_g":        round(fiber, 1),
            },
            "meal_breakdown":  meal_breakdown,
            "lifespan_curve":  {"ages": ages_curve, "scores": scores_curve},
            "recommendations": recs,
            "status":          get_status(final_score),
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


def bmi_category(bmi):
    if bmi < 18.5: return "Underweight"
    elif bmi < 25: return "Normal"
    elif bmi < 30: return "Overweight"
    else:          return "Obese"


def get_status(score):
    if score >= 70: return {"label": "Healthy",  "color": "#22c55e"}
    elif score >= 60: return {"label": "Moderate", "color": "#f59e0b"}
    else:             return {"label": "At Risk",  "color": "#ef4444"}
