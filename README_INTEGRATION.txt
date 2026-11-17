HEART / 01 — INTEGRATED FRONT PAGE

Updated files:
1. templates/landing.html
   - Added Workspace navigation and connected CTAs.
   - Added four workspace cards linking to /dashboard, /prediction, /history and /dashboard#model-performance.
   - Preserved the existing hero, anatomical heart visual, feature cards and theme.
2. static/css/style.css
   - Added responsive styling for the connected workspace section.
3. templates/prediction.html
   - Corrected the Prediction History sidebar link to /history.

All existing backend routes and prediction/history logic were preserved.

Replace these files in your existing ML-P project, keeping the same folder paths.
The project already contains Flask routes for /, /dashboard, /prediction and /history.
Run from the ML-P folder:
    python app.py
Then open:
    http://127.0.0.1:5000/
