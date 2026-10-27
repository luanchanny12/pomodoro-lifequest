from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io, csv
from app.database import get_db, engine
from app.models import *
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

router = APIRouter(prefix="/api/exports", tags=["Xuất dữ liệu"])

MODEL_MAP = {
    "goals": Goal, "roadmaps": RoadmapItem, "courses": Course,
    "tasks": Task, "sprints": Sprint, "daily_logs": DailyLog,
    "study_hours": StudyHour, "vocabulary": Vocabulary, "ipa": IPA,
    "backlog": BacklogItem, "achievements": Achievement, "levels": Level,
}


@router.get("/excel")
def export_excel(db: Session = Depends(get_db)):
    import pandas as pd
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        for name, model in MODEL_MAP.items():
            rows = db.query(model).all()
            if not rows:
                continue
            data = [{c.name: getattr(r, c.name) for c in model.__table__.columns} for r in rows]
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name=name, index=False)
    buffer.seek(0)
    return StreamingResponse(
        buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=lifequest_data.xlsx"}
    )


@router.get("/pdf")
def export_pdf(db: Session = Depends(get_db)):
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    p.setFont("Helvetica-Bold", 16)
    p.drawString(20 * mm, height - 20 * mm, "LIFE QUEST - Báo Cáo")
    p.setFont("Helvetica", 10)
    y = height - 40 * mm
    for name, model in MODEL_MAP.items():
        rows = db.query(model).limit(20).all()
        if not rows or y < 30 * mm:
            continue
        p.setFont("Helvetica-Bold", 12)
        p.drawString(20 * mm, y, name.upper())
        y -= 8 * mm
        p.setFont("Helvetica", 9)
        for r in rows:
            cols = [c.name for c in model.__table__.columns][:5]
            text = " | ".join(str(getattr(r, c, ""))[:30] for c in cols)
            p.drawString(20 * mm, y, text)
            y -= 5 * mm
            if y < 20 * mm:
                p.showPage()
                y = height - 20 * mm
        y -= 5 * mm
    p.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer, media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=lifequest_report.pdf"}
    )


@router.get("/csv/{table}")
def export_csv(table: str, db: Session = Depends(get_db)):
    model = MODEL_MAP.get(table)
    if not model:
        raise HTTPException(404, f"Bảng '{table}' không tồn tại")
    rows = db.query(model).all()
    output = io.StringIO()
    writer = csv.writer(output)
    cols = [c.name for c in model.__table__.columns]
    writer.writerow(cols)
    for r in rows:
        writer.writerow([getattr(r, c, "") for c in cols])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={table}.csv"}
    )
